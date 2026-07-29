import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DaysPaidCell } from "@/components/payroll/DaysPaidCell";
import { finalizePayrollRun, deleteDraftPayrollRun } from "@/actions/payrollActions";
import { MONTH_NAMES } from "@/lib/dates";

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default async function PayrollRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();

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

  const totals = run.payslipLines.reduce(
    (acc, line) => ({
      gross: acc.gross + Number(line.grossEarnings),
      pf: acc.pf + Number(line.pfEmployee),
      esi: acc.esi + Number(line.esiEmployee),
      pt: acc.pt + Number(line.ptAmount),
      tds: acc.tds + Number(line.tdsAmount),
      net: acc.net + Number(line.netPay),
    }),
    { gross: 0, pf: 0, esi: 0, pt: 0, tds: 0, net: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {MONTH_NAMES[run.month - 1]} {run.year}
          </h1>
          <span
            className={
              isDraft
                ? "rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700"
                : "rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700"
            }
          >
            {isDraft ? "Draft" : "Finalized"}
          </span>
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
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Export for CA
          </Link>
        )}
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 pr-4">Employee</th>
              <th className="py-2 pr-4">Days paid</th>
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
              <tr key={line.id} className="border-b border-slate-100 text-slate-700">
                <td className="py-2 pr-4 font-medium text-slate-900">{line.employee.name}</td>
                <td className="py-2 pr-4">
                  <DaysPaidCell
                    payrollRunId={run.id}
                    employeeId={line.employeeId}
                    daysPaid={Number(line.daysPaid)}
                    daysInMonth={line.daysInMonth}
                    editable={isDraft}
                  />
                </td>
                <td className="py-2 pr-4">{inr(Number(line.grossEarnings))}</td>
                <td className="py-2 pr-4">{inr(Number(line.pfEmployee))}</td>
                <td className="py-2 pr-4">{inr(Number(line.esiEmployee))}</td>
                <td className="py-2 pr-4">{inr(Number(line.ptAmount))}</td>
                <td className="py-2 pr-4">{inr(Number(line.tdsAmount))}</td>
                <td className="py-2 pr-4 font-semibold text-slate-900">{inr(Number(line.netPay))}</td>
                {!isDraft && (
                  <td className="py-2 pr-4">
                    <a
                      href={`/api/payroll/${run.id}/payslip/${line.employeeId}`}
                      className="text-sm font-semibold text-blue-700 hover:underline"
                    >
                      Payslip
                    </a>
                  </td>
                )}
              </tr>
            ))}
            {run.payslipLines.length === 0 && (
              <tr>
                <td colSpan={8} className="py-4 text-center text-slate-400">
                  No active employees to pay.
                </td>
              </tr>
            )}
          </tbody>
          {run.payslipLines.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-slate-300 font-semibold text-slate-900">
                <td className="py-2 pr-4">Total</td>
                <td className="py-2 pr-4"></td>
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
