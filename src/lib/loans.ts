import { db } from "@/lib/db";

export interface LoanBalance {
  amountRepaid: number;
  outstanding: number;
}

// The balance is never stored — always derived by summing this loan's
// PayrollAdjustment rows on FINALIZED runs only, so a Draft run's EMI
// adjustment (still editable/removable) never counts against it. See the
// comment on PayrollAdjustment.loanId in prisma/schema.prisma.
export async function loanBalance(loanId: string, principalAmount: number): Promise<LoanBalance> {
  const paid = await db.payrollAdjustment.aggregate({
    where: { loanId, payrollRun: { status: "FINALIZED" } },
    _sum: { amount: true },
  });
  const amountRepaid = Number(paid._sum.amount ?? 0);
  return { amountRepaid, outstanding: Math.max(0, principalAmount - amountRepaid) };
}
