import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AddLoanForm } from "@/components/loans/AddLoanForm";
import { cancelLoan } from "@/actions/loanActions";
import { loanBalance } from "@/lib/loans";

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default async function LoansPage() {
  const session = await requireSession(["SUPERADMIN", "HR_MANAGER"]);

  const [employees, loans] = await Promise.all([
    db.employee.findMany({
      where: { orgId: session.orgId, status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, employeeCode: true },
    }),
    db.loan.findMany({
      where: { orgId: session.orgId },
      orderBy: { createdAt: "desc" },
      include: { employee: { select: { name: true, employeeCode: true } } },
    }),
  ]);

  const rows = await Promise.all(
    loans.map(async (loan) => ({
      loan,
      balance: await loanBalance(loan.id, Number(loan.principalAmount)),
    })),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Loans &amp; Advances</h1>

      <Card>
        <h2 className="mb-1 text-lg font-bold text-white">Add a loan or advance</h2>
        <p className="mb-4 text-sm text-slate-400">
          The EMI is deducted automatically every payroll run until the principal is fully repaid — kept outside
          the PF/ESI wage base, like any one-off adjustment. Repayment progress only counts EMIs from finalized
          runs.
        </p>
        <AddLoanForm employees={employees} />
      </Card>

      <Card className="overflow-x-auto">
        <h2 className="mb-4 text-lg font-bold text-white">All loans</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-400">No loans or advances yet.</p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="py-2 pr-4">Employee</th>
                <th className="py-2 pr-4">Loan</th>
                <th className="py-2 pr-4">Principal</th>
                <th className="py-2 pr-4">EMI</th>
                <th className="py-2 pr-4">Repaid / Outstanding</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ loan, balance }) => (
                <tr key={loan.id} className="border-b border-slate-800 text-slate-300">
                  <td className="py-2 pr-4 font-medium text-white">
                    {loan.employee.name} ({loan.employee.employeeCode})
                  </td>
                  <td className="py-2 pr-4">{loan.name}</td>
                  <td className="py-2 pr-4">{inr(Number(loan.principalAmount))}</td>
                  <td className="py-2 pr-4">{inr(Number(loan.emiAmount))}</td>
                  <td className="py-2 pr-4">
                    {inr(balance.amountRepaid)} / {inr(balance.outstanding)}
                  </td>
                  <td className="py-2 pr-4">
                    <Badge
                      tone={loan.status === "ACTIVE" ? "success" : loan.status === "CLOSED" ? "neutral" : "danger"}
                    >
                      {loan.status}
                    </Badge>
                  </td>
                  <td className="py-2 pr-4">
                    {loan.status === "ACTIVE" && (
                      <form action={cancelLoan.bind(null, loan.id)}>
                        <button type="submit" className="text-sm font-semibold text-amber-400 hover:underline">
                          Cancel
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
