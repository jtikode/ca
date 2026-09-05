"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertSession } from "@/lib/permissions";
import { reimbursementClaimSchema, reimbursementReviewSchema } from "@/lib/validators";
import { recomputeOneEmployeeLine } from "@/actions/payrollActions";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function submitReimbursementClaim(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await assertSession(["EMPLOYEE"]);
  if (!session.employeeId) return { ok: false, error: "No employee record linked to this login." };

  const parsed = reimbursementClaimSchema.safeParse({
    category: formData.get("category"),
    amount: formData.get("amount"),
    description: formData.get("description"),
    receiptUrl: formData.get("receiptUrl"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db.reimbursementClaim.create({
    data: { orgId: session.orgId, employeeId: session.employeeId, ...parsed.data },
  });

  revalidatePath("/my-reimbursements");
  revalidatePath("/reimbursements");
  return { ok: true };
}

export async function reviewReimbursementClaim(
  claimId: string,
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

  const parsed = reimbursementReviewSchema.safeParse({
    decision: formData.get("decision"),
    reviewNote: formData.get("reviewNote"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const claim = await db.reimbursementClaim.findFirst({ where: { id: claimId, orgId: session.orgId } });
  if (!claim || claim.status !== "PENDING") return { ok: false, error: "Claim not found or already reviewed." };

  await db.reimbursementClaim.update({
    where: { id: claimId },
    data: {
      status: parsed.data.decision,
      reviewNote: parsed.data.reviewNote,
      reviewedById: session.userId,
      reviewedAt: new Date(),
    },
  });

  revalidatePath("/reimbursements");
  revalidatePath("/my-reimbursements");
  return { ok: true };
}

// Folds an APPROVED-but-unpaid claim into a Draft run as a normal EARNING
// PayrollAdjustment — same treatment as any other one-off addition, kept
// out of the PF/ESI wage base. Marks the claim PAID and links it so
// removePayrollAdjustment can revert it if the adjustment is later removed.
export async function addReimbursementToPayrollRun(claimId: string, payrollRunId: string): Promise<ActionResult> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

  const [claim, run] = await Promise.all([
    db.reimbursementClaim.findFirst({ where: { id: claimId, orgId: session.orgId } }),
    db.payrollRun.findFirst({ where: { id: payrollRunId, orgId: session.orgId } }),
  ]);
  if (!claim || claim.status !== "APPROVED") return { ok: false, error: "Claim not found or not approved." };
  if (!run || run.status === "FINALIZED") return { ok: false, error: "That payroll run isn't a Draft." };

  const categoryLabel = claim.category.charAt(0) + claim.category.slice(1).toLowerCase();
  const adjustment = await db.payrollAdjustment.create({
    data: {
      payrollRunId,
      employeeId: claim.employeeId,
      name: `Reimbursement — ${categoryLabel}`,
      amount: claim.amount,
      type: "EARNING",
    },
  });

  await db.reimbursementClaim.update({
    where: { id: claimId },
    data: { status: "PAID", payrollAdjustmentId: adjustment.id },
  });

  await recomputeOneEmployeeLine(payrollRunId, claim.employeeId, session.orgId);

  revalidatePath("/reimbursements");
  revalidatePath(`/payroll/${payrollRunId}`);
  return { ok: true };
}
