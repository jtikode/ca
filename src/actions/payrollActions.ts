"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertSession } from "@/lib/permissions";
import { payrollRunInputSchema, payrollAdjustmentSchema } from "@/lib/validators";
import { computePayslipLine, type AdjustmentInput } from "@/lib/payrollEngine";
import { sendPayslipEmailInternal } from "@/actions/payslipEmailActions";

async function getAdjustments(payrollRunId: string, employeeId: string): Promise<AdjustmentInput[]> {
  const rows = await db.payrollAdjustment.findMany({ where: { payrollRunId, employeeId } });
  return rows.map((r) => ({ name: r.name, amount: Number(r.amount), type: r.type }));
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

  await recomputeRun(run.id, session.orgId);

  redirect(`/payroll/${run.id}`);
}

async function recomputeRun(payrollRunId: string, orgId: string) {
  const run = await db.payrollRun.findFirstOrThrow({ where: { id: payrollRunId, orgId } });
  const employees = await db.employee.findMany({ where: { orgId, status: "ACTIVE" } });

  for (const employee of employees) {
    const adjustments = await getAdjustments(payrollRunId, employee.id);
    const line = await computePayslipLine(orgId, employee.id, run.month, run.year, undefined, adjustments);
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

  const adjustments = await getAdjustments(payrollRunId, employeeId);
  const line = await computePayslipLine(session.orgId, employeeId, run.month, run.year, undefined, adjustments);
  if (line) {
    await db.payslipLine.update({
      where: { payrollRunId_employeeId: { payrollRunId, employeeId } },
      data: line,
    });
  }

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

  const adjustments = await getAdjustments(adjustment.payrollRunId, adjustment.employeeId);
  const line = await computePayslipLine(
    session.orgId,
    adjustment.employeeId,
    adjustment.payrollRun.month,
    adjustment.payrollRun.year,
    undefined,
    adjustments,
  );
  if (line) {
    await db.payslipLine.update({
      where: { payrollRunId_employeeId: { payrollRunId: adjustment.payrollRunId, employeeId: adjustment.employeeId } },
      data: line,
    });
  }

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
