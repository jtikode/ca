import Link from "next/link";
import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import {
  currentFinancialYear,
  financialYearAndQuarterFor,
  monthsInFinancialYear,
  quarterLabel,
  type Quarter,
} from "@/lib/dates";
import { aggregateOrgPayslipLines } from "@/lib/exports/periodAggregation";

function recentFinancialYears(current: string): string[] {
  const startYear = Number(current.slice(0, 4));
  return [0, 1, 2, 3].map((back) => {
    const y = startYear - back;
    return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
  });
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string; quarter?: string }>;
}) {
  const session = await requireSession(["SUPERADMIN", "HR_MANAGER"]);
  const params = await searchParams;

  const currentFy = currentFinancialYear();
  const fy = params.fy && /^\d{4}-\d{2}$/.test(params.fy) ? params.fy : currentFy;
  const now = new Date();
  const defaultQuarter = financialYearAndQuarterFor(now.getMonth() + 1, now.getFullYear()).quarter;
  const quarterNum = Number(params.quarter);
  const quarter = ([1, 2, 3, 4].includes(quarterNum) ? quarterNum : defaultQuarter) as Quarter;

  const [org, aggregation] = await Promise.all([
    db.organization.findUniqueOrThrow({ where: { id: session.orgId } }),
    aggregateOrgPayslipLines(session.orgId, monthsInFinancialYear(fy)),
  ]);

  const hasPanTan = Boolean(org.pan && org.tan);
  const employeesWithPay = Array.from(aggregation.employeeTotals.values())
    .filter((t) => t.grossEarnings > 0)
    .sort((a, b) => a.employee.name.localeCompare(b.employee.name));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Reports</h1>

      <Card>
        <form method="GET" className="flex flex-wrap items-end gap-3">
          <Field label="Financial year">
            <Select name="fy" defaultValue={fy}>
              {recentFinancialYears(currentFy).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Quarter (for Form 24Q)">
            <Select name="quarter" defaultValue={quarter}>
              {([1, 2, 3, 4] as Quarter[]).map((q) => (
                <option key={q} value={q}>
                  {quarterLabel(fy, q)}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit">View</Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-1 text-lg font-bold text-white">Form 16 – Part B</h2>
        <p className="mb-4 text-sm text-slate-400">
          The salary and tax computation annexure only — not a substitute for the official Part A, which
          must be downloaded from the TRACES portal. Figures are computed estimates for your CA to verify.
        </p>
        {!hasPanTan ? (
          <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-400">
            Add your company&apos;s PAN and TAN in{" "}
            <Link href="/settings" className="underline">
              Settings
            </Link>{" "}
            before generating Form 16 Part B.
          </p>
        ) : employeesWithPay.length === 0 ? (
          <p className="text-sm text-slate-500">No finalized payroll found for {fy} yet.</p>
        ) : (
          <div className="space-y-3">
            <a
              href={`/api/reports/form16?fy=${fy}`}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-amber-500 px-4 text-sm font-semibold text-slate-950 shadow-[0_0_20px_-6px_rgba(245,158,11,0.5)] transition hover:bg-amber-400"
            >
              Download all (ZIP)
            </a>
            <table className="w-full min-w-[400px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="py-2 pr-4">Employee</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {employeesWithPay.map((t) => (
                  <tr key={t.employeeId} className="border-b border-slate-800 text-slate-300">
                    <td className="py-2 pr-4">
                      {t.employee.name} ({t.employee.employeeCode})
                    </td>
                    <td className="py-2 pr-4">
                      <a
                        href={`/api/reports/form16/${t.employeeId}?fy=${fy}`}
                        className="text-sm font-semibold text-amber-400 hover:underline"
                      >
                        Download PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-1 text-lg font-bold text-white">Form 24Q — Quarterly TDS Summary</h2>
        <p className="mb-4 text-sm text-slate-400">
          A CA-ready summary of TDS deducted per employee for the selected quarter — not an NSDL upload
          file. Your CA&apos;s own filing software still handles the actual e-filing.
        </p>
        <a
          href={`/api/reports/form24q?fy=${fy}&quarter=${quarter}`}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-amber-500 px-4 text-sm font-semibold text-slate-950 shadow-[0_0_20px_-6px_rgba(245,158,11,0.5)] transition hover:bg-amber-400"
        >
          Download {quarterLabel(fy, quarter)} Excel
        </a>
      </Card>

      <Card>
        <h2 className="mb-1 text-lg font-bold text-white">Annual PF / ESI / PT Summary</h2>
        <p className="mb-4 text-sm text-slate-400">
          Full financial-year PF, ESI, and Professional Tax figures per employee, for your CA&apos;s
          records.
        </p>
        <a
          href={`/api/reports/annual-statutory?fy=${fy}`}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-amber-500 px-4 text-sm font-semibold text-slate-950 shadow-[0_0_20px_-6px_rgba(245,158,11,0.5)] transition hover:bg-amber-400"
        >
          Download {fy} Excel
        </a>
      </Card>
    </div>
  );
}
