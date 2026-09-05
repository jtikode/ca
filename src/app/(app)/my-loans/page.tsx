import { notFound } from "next/navigation";
import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { loanBalance } from "@/lib/loans";

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default async function MyLoansPage() {
  const session = await requireSession(["EMPLOYEE"]);
  if (!session.employeeId) notFound();

  const loans = await db.loan.findMany({
    where: { employeeId: session.employeeId },
    orderBy: { createdAt: "desc" },
  });

  const rows = await Promise.all(
    loans.map(async (loan) => ({ loan, balance: await loanBalance(loan.id, Number(loan.principalAmount)) })),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">My Loans &amp; Advances</h1>

      <Card className="overflow-x-auto">
        {rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">No loans or advances on file.</p>
        ) : (
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="py-2 pr-4">Loan</th>
                <th className="py-2 pr-4">Principal</th>
                <th className="py-2 pr-4">Monthly EMI</th>
                <th className="py-2 pr-4">Outstanding</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ loan, balance }) => (
                <tr key={loan.id} className="border-b border-slate-800">
                  <td className="py-2 pr-4 font-medium text-white">{loan.name}</td>
                  <td className="py-2 pr-4 text-slate-400">{inr(Number(loan.principalAmount))}</td>
                  <td className="py-2 pr-4 text-slate-400">{inr(Number(loan.emiAmount))}</td>
                  <td className="py-2 pr-4 text-slate-400">{inr(balance.outstanding)}</td>
                  <td className="py-2 pr-4">
                    <Badge tone={loan.status === "ACTIVE" ? "success" : loan.status === "CLOSED" ? "neutral" : "danger"}>
                      {loan.status}
                    </Badge>
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
