import { notFound } from "next/navigation";
import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { MONTH_NAMES } from "@/lib/dates";

export default async function MyPayslipsPage() {
  const session = await requireSession(["EMPLOYEE"]);
  if (!session.employeeId) notFound();

  const employee = await db.employee.findFirst({
    where: { id: session.employeeId, orgId: session.orgId },
  });
  if (!employee) notFound();

  const payslipLines = await db.payslipLine.findMany({
    where: { employeeId: employee.id, payrollRun: { status: "FINALIZED" } },
    include: { payrollRun: true },
    orderBy: [{ payrollRun: { year: "desc" } }, { payrollRun: { month: "desc" } }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">{employee.name}</h1>
        <p className="text-sm text-slate-400">
          {employee.employeeCode} · {employee.state} · Joined {employee.doj.toLocaleDateString("en-IN")}
        </p>
      </div>

      <Card className="overflow-x-auto">
        <h2 className="mb-4 text-lg font-bold text-white">My payslips</h2>
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="py-2 pr-4">Period</th>
              <th className="py-2 pr-4">Net pay</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {payslipLines.map((line) => (
              <tr key={line.id} className="border-b border-slate-800">
                <td className="py-2 pr-4 font-medium text-white">
                  {MONTH_NAMES[line.payrollRun.month - 1]} {line.payrollRun.year}
                </td>
                <td className="py-2 pr-4 text-slate-400">₹{Number(line.netPay).toLocaleString("en-IN")}</td>
                <td className="py-2 pr-4">
                  <a
                    href={`/api/payroll/${line.payrollRunId}/payslip/${employee.id}`}
                    className="text-sm font-semibold text-amber-400 hover:underline"
                  >
                    Download
                  </a>
                </td>
              </tr>
            ))}
            {payslipLines.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-center text-slate-400">
                  No payslips yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
