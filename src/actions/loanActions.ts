"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertSession } from "@/lib/permissions";
import { loanSchema } from "@/lib/validators";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function createLoan(_prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

  const parsed = loanSchema.safeParse({
    employeeId: formData.get("employeeId"),
    name: formData.get("name"),
    principalAmount: formData.get("principalAmount"),
    emiAmount: formData.get("emiAmount"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const employee = await db.employee.findFirst({ where: { id: parsed.data.employeeId, orgId: session.orgId } });
  if (!employee) return { ok: false, error: "Employee not found." };

  await db.loan.create({
    data: {
      orgId: session.orgId,
      employeeId: parsed.data.employeeId,
      name: parsed.data.name,
      principalAmount: parsed.data.principalAmount,
      emiAmount: parsed.data.emiAmount,
    },
  });

  revalidatePath("/loans");
  revalidatePath(`/employees/${parsed.data.employeeId}`);
  return { ok: true };
}

// Stops future payroll runs from generating an EMI for this loan. Past
// EMI adjustments already on finalized runs are untouched — this only
// affects createPayrollRun's applyActiveLoanEmis going forward, same
// "history stays, only future generation changes" treatment as
// toggleEmployeeStatus for a deactivated employee.
export async function cancelLoan(loanId: string): Promise<void> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

  const loan = await db.loan.findFirst({ where: { id: loanId, orgId: session.orgId } });
  if (!loan || loan.status !== "ACTIVE") return;

  await db.loan.update({ where: { id: loanId }, data: { status: "CANCELLED" } });

  revalidatePath("/loans");
  revalidatePath(`/employees/${loan.employeeId}`);
}
