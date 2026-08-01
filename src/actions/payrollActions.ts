"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertSession } from "@/lib/permissions";
import { payrollRunInputSchema } from "@/lib/validators";
import { computePayslipLine } from "@/lib/payrollEngine";

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
    const line = await computePayslipLine(orgId, employee.id, run.month, run.year);
    if (!line) continue;

    await db.payslipLine.upsert({
      where: { payrollRunId_employeeId: { payrollRunId, employeeId: employee.id } },
      create: { payrollRunId, ...line },
      update: line,
    });
  }
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

  const line = await computePayslipLine(session.orgId, employeeId, run.month, run.year, daysPaid);
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

  revalidatePath(`/payroll/${payrollRunId}`);
  revalidatePath("/payroll");
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
