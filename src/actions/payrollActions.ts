"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertSession } from "@/lib/permissions";
import { payrollRunInputSchema, payrollAdjustmentSchema } from "@/lib/validators";
import { computePayslipLine, type AdjustmentInput } from "@/lib/payrollEngine";
import { sendPayslipEmailInternal } from "@/actions/payslipEmailActions";
import { daysInMonth } from "@/lib/dates";

async function getAdjustments(payrollRunId: string, employeeId: string): Promise<AdjustmentInput[]> {
  const rows = await db.payrollAdjustment.findMany({ where: { payrollRunId, employeeId } });
  return rows.map((r) => ({ name: r.name, amount: Number(r.amount), type: r.type }));
}

// Recomputes one employee's line without touching anything about days-paid —
// used after adding/removing an adjustment, where the only thing that
// should change is the adjustment total. Preserves whatever days-paid is
// already on the line (e.g. a prior manual partial-month edit) instead of
// resetting it back to a full month, same reasoning as recomputeRun below.
async function recomputeOneEmployeeLine(payrollRunId: string, employeeId: string, orgId: string) {
  const [run, employee, existingLine] = await Promise.all([
    db.payrollRun.findFirstOrThrow({ where: { id: payrollRunId } }),
    db.employee.findFirstOrThrow({ where: { id: employeeId } }),
    db.payslipLine.findUnique({ where: { payrollRunId_employeeId: { payrollRunId, employeeId } } }),
  ]);

  const daysPaidOverride =
    employee.payMode === "MONTHLY" && existingLine ? Number(existingLine.daysPaid) : undefined;
  const adjustments = await getAdjustments(payrollRunId, employeeId);
  const line = await computePayslipLine(orgId, employeeId, run.month, run.year, daysPaidOverride, adjustments);
  if (!line) return;

  await db.payslipLine.upsert({
    where: { payrollRunId_employeeId: { payrollRunId, employeeId } },
    create: { payrollRunId, ...line },
    update: line,
  });
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function createPayrollRun(_prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

  const parsed = payrollRunInputSchema.safeParse({
    month: formData.get("month"),
    year: formData.get("year"),
    copyFromLastRun: formData.get("copyFromLastRun"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const existing = await db.payrollRun.findUnique({
    where: { orgId_month_year: { orgId: session.orgId, month: parsed.data.month, year: parsed.data.year } },
  });
  if (existing) {
    redirect(`/payroll/${existing.id}`);
  }

  const run = await db.payrollRun.create({
    data: { orgId: session.orgId, month: parsed.data.month, year: parsed.data.year },
  });

  const daysPaidOverrides = parsed.data.copyFromLastRun
    ? await copyFromPreviousRun(run.id, session.orgId, parsed.data.month, parsed.data.year)
    : undefined;

  await recomputeRun(run.id, session.orgId, daysPaidOverrides);

  redirect(`/payroll/${run.id}`);
}

// For a small business that pays the same people the same amount every
// month: seeds the new (still fully-editable) Draft with the previous run's
// per-employee adjustments and days-paid, instead of leaving HR to re-enter
// them by hand. Returns the days-paid map for recomputeRun to apply.
async function copyFromPreviousRun(
  newRunId: string,
  orgId: string,
  newMonth: number,
  newYear: number,
): Promise<Map<string, number>> {
  const previousRun = await db.payrollRun.findFirst({
    where: { orgId, id: { not: newRunId } },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: { payslipLines: true, payrollAdjustments: true },
  });
  if (!previousRun) return new Map();

  if (previousRun.payrollAdjustments.length > 0) {
    await db.payrollAdjustment.createMany({
      data: previousRun.payrollAdjustments.map((a) => ({
        payrollRunId: newRunId,
        employeeId: a.employeeId,
        name: a.name,
        amount: a.amount,
        type: a.type,
      })),
    });
  }

  const newTotalDays = daysInMonth(newMonth, newYear);
  const overrides = new Map<string, number>();
  for (const line of previousRun.payslipLines) {
    const prevDaysPaid = Number(line.daysPaid);
    // Paid in full last month → let the new month default to its own full
    // day count instead of carrying over a raw number that may not match a
    // different month length (28 vs 30 vs 31 days).
    if (prevDaysPaid >= line.daysInMonth) continue;
    // Otherwise carry over the same attendance ratio, scaled to this month.
    const ratio = line.daysInMonth > 0 ? prevDaysPaid / line.daysInMonth : 1;
    overrides.set(line.employeeId, Math.round(ratio * newTotalDays * 2) / 2);
  }
  return overrides;
}

async function recomputeRun(payrollRunId: string, orgId: string, daysPaidOverrides?: Map<string, number>) {
  const run = await db.payrollRun.findFirstOrThrow({ where: { id: payrollRunId, orgId } });
  const employees = await db.employee.findMany({ where: { orgId, status: "ACTIVE" } });
  // Whatever's already recorded on this run (e.g. a manual partial-days
  // edit) — used as the fallback below so recomputing for an unrelated
  // reason (Recompute button, adding/removing an adjustment) doesn't
  // silently reset an employee back to a full month.
  const existingLines = await db.payslipLine.findMany({ where: { payrollRunId } });
  const existingDaysPaid = new Map(existingLines.map((l) => [l.employeeId, Number(l.daysPaid)]));

  for (const employee of employees) {
    const adjustments = await getAdjustments(payrollRunId, employee.id);
    // Only apply a days-paid figure for standard MONTHLY employees —
    // HOURLY_ATTENDANCE/WAGE_BASED pay should keep computing from this
    // month's own attendance, not a stored/copied day count.
    const daysPaidOverride =
      employee.payMode === "MONTHLY"
        ? (daysPaidOverrides?.get(employee.id) ?? existingDaysPaid.get(employee.id))
        : undefined;
    const line = await computePayslipLine(orgId, employee.id, run.month, run.year, daysPaidOverride, adjustments);
    if (!line) continue;

    await db.payslipLine.upsert({
      where: { payrollRunId_employeeId: { payrollRunId, employeeId: employee.id } },
      create: { payrollRunId, ...line },
      update: line,
    });
  }
}

// Re-runs every active employee's line on a Draft run — the escape hatch
// for picking up edits made elsewhere (a salary structure change, an
// attendance correction, or a run just reverted from Finalized) without
// discarding and recreating the whole run.
export async function recomputePayrollRun(payrollRunId: string): Promise<void> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

  const run = await db.payrollRun.findFirst({ where: { id: payrollRunId, orgId: session.orgId } });
  if (!run || run.status === "FINALIZED") return;

  await recomputeRun(payrollRunId, session.orgId);

  revalidatePath(`/payroll/${payrollRunId}`);
}

export async function updateDaysPaid(
  payrollRunId: string,
  employeeId: string,
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

  const run = await db.payrollRun.findFirst({ where: { id: payrollRunId, orgId: session.orgId } });
  if (!run) return { ok: false, error: "Payroll run not found." };
  if (run.status === "FINALIZED") return { ok: false, error: "This run is already finalized." };

  const daysPaid = Number(formData.get("daysPaid"));
  if (Number.isNaN(daysPaid) || daysPaid < 0) {
    return { ok: false, error: "Enter a valid number of days." };
  }

  const adjustments = await getAdjustments(payrollRunId, employeeId);
  const line = await computePayslipLine(session.orgId, employeeId, run.month, run.year, daysPaid, adjustments);
  if (!line) return { ok: false, error: "Could not recompute this employee's payslip." };

  await db.payslipLine.update({
    where: { payrollRunId_employeeId: { payrollRunId, employeeId } },
    data: line,
  });

  revalidatePath(`/payroll/${payrollRunId}`);
  return { ok: true };
}

export async function finalizePayrollRun(payrollRunId: string): Promise<void> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

  const run = await db.payrollRun.findFirst({ where: { id: payrollRunId, orgId: session.orgId } });
  if (!run || run.status === "FINALIZED") return;

  await db.payrollRun.update({
    where: { id: payrollRunId },
    data: { status: "FINALIZED", finalizedAt: new Date() },
  });

  const org = await db.organization.findUniqueOrThrow({ where: { id: session.orgId } });
  if (org.payslipEmailEnabled) {
    const lines = await db.payslipLine.findMany({
      where: { payrollRunId },
      include: { employee: true },
    });
    for (const line of lines) {
      if (!line.employee.email) continue;
      try {
        await sendPayslipEmailInternal(payrollRunId, line.employeeId, session.orgId);
      } catch (err) {
        console.error(`Failed to email payslip to ${line.employee.email}`, err);
      }
    }
  }

  revalidatePath(`/payroll/${payrollRunId}`);
  revalidatePath("/payroll");
}

// A deliberate, explicit exception to "immutable once finalized" (see the
// PayslipLine schema comment) — not silent editing. The caller's UI must
// warn that already-downloaded/emailed payslips go stale until re-finalized.
export async function revertPayrollRunToDraft(payrollRunId: string): Promise<ActionResult> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

  const run = await db.payrollRun.findFirst({ where: { id: payrollRunId, orgId: session.orgId } });
  if (!run) return { ok: false, error: "Payroll run not found." };
  if (run.status !== "FINALIZED") return { ok: false, error: "This run is not finalized." };

  await db.payrollRun.update({
    where: { id: payrollRunId },
    data: { status: "DRAFT", finalizedAt: null },
  });

  revalidatePath(`/payroll/${payrollRunId}`);
  revalidatePath("/payroll");
  return { ok: true };
}

export async function addPayrollAdjustment(
  payrollRunId: string,
  employeeId: string,
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

  const run = await db.payrollRun.findFirst({ where: { id: payrollRunId, orgId: session.orgId } });
  if (!run) return { ok: false, error: "Payroll run not found." };
  if (run.status === "FINALIZED") return { ok: false, error: "This run is already finalized." };

  const parsed = payrollAdjustmentSchema.safeParse({
    name: formData.get("name"),
    amount: formData.get("amount"),
    type: formData.get("type"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db.payrollAdjustment.create({
    data: { payrollRunId, employeeId, ...parsed.data },
  });

  await recomputeOneEmployeeLine(payrollRunId, employeeId, session.orgId);

  revalidatePath(`/payroll/${payrollRunId}`);
  return { ok: true };
}

export async function removePayrollAdjustment(adjustmentId: string): Promise<void> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

  const adjustment = await db.payrollAdjustment.findFirst({
    where: { id: adjustmentId, payrollRun: { orgId: session.orgId } },
    include: { payrollRun: true },
  });
  if (!adjustment || adjustment.payrollRun.status === "FINALIZED") return;

  await db.payrollAdjustment.delete({ where: { id: adjustmentId } });

  await recomputeOneEmployeeLine(adjustment.payrollRunId, adjustment.employeeId, session.orgId);

  revalidatePath(`/payroll/${adjustment.payrollRunId}`);
}

export async function deleteDraftPayrollRun(payrollRunId: string): Promise<void> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

  const run = await db.payrollRun.findFirst({ where: { id: payrollRunId, orgId: session.orgId } });
  if (!run || run.status === "FINALIZED") return;

  await db.$transaction([
    db.payslipLine.deleteMany({ where: { payrollRunId } }),
    db.payrollRun.delete({ where: { id: payrollRunId } }),
  ]);

  revalidatePath("/payroll");
  redirect("/payroll");
}
