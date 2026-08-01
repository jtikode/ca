import Link from "next/link";
import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { NewRunForm } from "@/components/payroll/NewRunForm";
import { MONTH_NAMES } from "@/lib/dates";

export default async function PayrollPage() {
  const session = await requireSession(["SUPERADMIN", "HR_MANAGER"]);
  const runs = await db.payrollRun.findMany({
    where: { orgId: session.orgId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: { _count: { select: { payslipLines: true } } },
  });

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-4 text-lg font-bold text-slate-900">Start a payroll run</h2>
        <NewRunForm />
      </Card>

      <Card className="overflow-x-auto">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Payroll runs</h2>
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 pr-4">Period</th>
              <th className="py-2 pr-4">Employees</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id} className="border-b border-slate-100">
                <td className="py-2 pr-4 font-medium text-slate-900">
                  {MONTH_NAMES[run.month - 1]} {run.year}
                </td>
                <td className="py-2 pr-4 text-slate-600">{run._count.payslipLines}</td>
                <td className="py-2 pr-4">
                  <span
                    className={
                      run.status === "FINALIZED"
                        ? "rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700"
                        : "rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700"
                    }
                  >
                    {run.status === "FINALIZED" ? "Finalized" : "Draft"}
                  </span>
                </td>
                <td className="py-2 pr-4">
                  <Link href={`/payroll/${run.id}`} className="text-sm font-semibold text-blue-700 hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {runs.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-slate-400">
                  No payroll runs yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
