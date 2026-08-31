import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DaysPaidCell } from "@/components/payroll/DaysPaidCell";
import { EmailPayslipButton } from "@/components/payroll/EmailPayslipButton";
import { finalizePayrollRun, deleteDraftPayrollRun } from "@/actions/payrollActions";
import { MONTH_NAMES } from "@/lib/dates";

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default async function PayrollRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession(["SUPERADMIN", "HR_MANAGER"]);

  const run = await db.payrollRun.findFirst({
    where: { id, orgId: session.orgId },
    include: {
      payslipLines: {
        include: { employee: true },
        orderBy: { employee: { name: "asc" } },
      },
    },
  });

  if (!run) notFound();

  const isDraft = run.status === "DRAFT";
  const hasAttendanceDeduction = run.payslipLines.some((line) => Number(line.attendanceDeduction) > 0);
  const hasOvertime = run.payslipLines.some((line) => Number(line.overtimeAmount) > 0);

  const totals = run.payslipLines.reduce(
    (acc, line) => ({
      gross: acc.gross + Number(line.grossEarnings),
      pf: acc.pf + Number(line.pfEmployee),
      esi: acc.esi + Number(line.esiEmployee),
      pt: acc.pt + Number(line.ptAmount),
      tds: acc.tds + Number(line.tdsAmount),
      net: acc.net + Number(line.netPay),
      attendanceDeduction: acc.attendanceDeduction + Number(line.attendanceDeduction),
      overtimeAmount: acc.overtimeAmount + Number(line.overtimeAmount),
    }),
    { gross: 0, pf: 0, esi: 0, pt: 0, tds: 0, net: 0, attendanceDeduction: 0, overtimeAmount: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">
            {MONTH_NAMES[run.month - 1]} {run.year}
          </h1>
          <Badge tone={isDraft ? "warning" : "success"}>{isDraft ? "Draft" : "Finalized"}</Badge>
        </div>
        {isDraft ? (
          <div className="flex gap-2">
            <form action={deleteDraftPayrollRun.bind(null, run.id)}>
              <Button type="submit" variant="outline">
                Discard run
              </Button>
            </form>
            <form action={finalizePayrollRun.bind(null, run.id)}>
              <Button type="submit">Finalize run</Button>
            </form>
          </div>
        ) : (
          <Link
            href={`/payroll/${run.id}/export`}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-amber-500 px-4 text-sm font-semibold text-slate-950 shadow-[0_0_20px_-6px_rgba(245,158,11,0.5)] transition hover:bg-amber-400"
          >
            Export for CA
          </Link>
        )}
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="py-2 pr-4">Employee</th>
              <th className="py-2 pr-4">Days paid</th>
              {hasAttendanceDeduction && <th className="py-2 pr-4">Attendance deduction</th>}
              {hasOvertime && <th className="py-2 pr-4">Overtime</th>}
              <th className="py-2 pr-4">Gross</th>
              <th className="py-2 pr-4">PF (emp.)</th>
              <th className="py-2 pr-4">ESI (emp.)</th>
              <th className="py-2 pr-4">PT</th>
              <th className="py-2 pr-4">TDS</th>
              <th className="py-2 pr-4">Net pay</th>
              {!isDraft && <th className="py-2 pr-4"></th>}
            </tr>
          </thead>
          <tbody>
            {run.payslipLines.map((line) => (
              <tr key={line.id} className="border-b border-slate-800 text-slate-300">
                <td className="py-2 pr-4 font-medium text-white">{line.employee.name}</td>
                <td className="py-2 pr-4">
                  <DaysPaidCell
                    payrollRunId={run.id}
                    employeeId={line.employeeId}
                    daysPaid={Number(line.daysPaid)}
                    daysInMonth={line.daysInMonth}
                    editable={isDraft}
                  />
                </td>
                {hasAttendanceDeduction && (
                  <td className="py-2 pr-4">
                    {Number(line.attendanceDeduction) > 0 ? `-${inr(Number(line.attendanceDeduction))}` : "—"}
                  </td>
                )}
                {hasOvertime && (
                  <td className="py-2 pr-4">
                    {Number(line.overtimeAmount) > 0 ? `+${inr(Number(line.overtimeAmount))}` : "—"}
                  </td>
                )}
                <td className="py-2 pr-4">{inr(Number(line.grossEarnings))}</td>
                <td className="py-2 pr-4">{inr(Number(line.pfEmployee))}</td>
                <td className="py-2 pr-4">{inr(Number(line.esiEmployee))}</td>
                <td className="py-2 pr-4">{inr(Number(line.ptAmount))}</td>
                <td className="py-2 pr-4">{inr(Number(line.tdsAmount))}</td>
                <td className="py-2 pr-4 font-semibold text-white">{inr(Number(line.netPay))}</td>
                {!isDraft && (
                  <td className="py-2 pr-4">
                    <div className="flex flex-col items-start gap-1">
                      <a
                        href={`/api/payroll/${run.id}/payslip/${line.employeeId}`}
                        className="text-sm font-semibold text-amber-400 hover:underline"
                      >
                        Payslip
                      </a>
                      <EmailPayslipButton payrollRunId={run.id} employeeId={line.employeeId} />
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {run.payslipLines.length === 0 && (
              <tr>
                <td
                  colSpan={8 + (hasAttendanceDeduction ? 1 : 0) + (hasOvertime ? 1 : 0)}
                  className="py-4 text-center text-slate-400"
                >
                  No active employees to pay.
                </td>
              </tr>
            )}
          </tbody>
          {run.payslipLines.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-slate-700 font-semibold text-white">
                <td className="py-2 pr-4">Total</td>
                <td className="py-2 pr-4"></td>
                {hasAttendanceDeduction && (
                  <td className="py-2 pr-4">
                    {totals.attendanceDeduction > 0 ? `-${inr(totals.attendanceDeduction)}` : "—"}
                  </td>
                )}
                {hasOvertime && (
                  <td className="py-2 pr-4">
                    {totals.overtimeAmount > 0 ? `+${inr(totals.overtimeAmount)}` : "—"}
                  </td>
                )}
                <td className="py-2 pr-4">{inr(totals.gross)}</td>
                <td className="py-2 pr-4">{inr(totals.pf)}</td>
                <td className="py-2 pr-4">{inr(totals.esi)}</td>
                <td className="py-2 pr-4">{inr(totals.pt)}</td>
                <td className="py-2 pr-4">{inr(totals.tds)}</td>
                <td className="py-2 pr-4">{inr(totals.net)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </Card>
    </div>
  );
}
