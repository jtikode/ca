import Link from "next/link";
import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
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
        <h2 className="mb-4 text-lg font-bold text-white">Start a payroll run</h2>
        <NewRunForm />
      </Card>

      <Card className="overflow-x-auto">
        <h2 className="mb-4 text-lg font-bold text-white">Payroll runs</h2>
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="py-2 pr-4">Period</th>
              <th className="py-2 pr-4">Employees</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id} className="border-b border-slate-800">
                <td className="py-2 pr-4 font-medium text-white">
                  {MONTH_NAMES[run.month - 1]} {run.year}
                </td>
                <td className="py-2 pr-4 text-slate-400">{run._count.payslipLines}</td>
                <td className="py-2 pr-4">
                  <Badge tone={run.status === "FINALIZED" ? "success" : "warning"}>
                    {run.status === "FINALIZED" ? "Finalized" : "Draft"}
                  </Badge>
                </td>
                <td className="py-2 pr-4">
                  <Link href={`/payroll/${run.id}`} className="text-sm font-semibold text-amber-400 hover:underline">
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
