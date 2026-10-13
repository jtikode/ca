import Link from "next/link";
import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ArrearsForm } from "@/components/common/ArrearsForm";
import { addBonusToDraft, addAllBonusToDraft, addGratuityToDraft } from "@/actions/earningsActions";
import { currentFinancialYear, MONTH_NAMES } from "@/lib/dates";
import { calculateGratuity, grossFromEarnings } from "@/lib/statutory";
import {
  BONUS_DEFAULT_CEILING,
  BONUS_ELIGIBILITY_WAGE_LIMIT,
  BONUS_MAX_RATE,
  BONUS_MIN_RATE,
  bonusMonthsInFinancialYear,
  calculateBonus,
} from "@/lib/bonus";

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default async function EarningsPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string; rate?: string; ceiling?: string }>;
}) {
  const session = await requireSession(["SUPERADMIN", "HR_MANAGER"]);
  const params = await searchParams;

  const fy = params.fy && /^\d{4}-\d{2}$/.test(params.fy) ? params.fy : currentFinancialYear();
  const rateNum = Number(params.rate ?? BONUS_MIN_RATE);
  const rate = rateNum >= BONUS_MIN_RATE && rateNum <= BONUS_MAX_RATE ? rateNum : BONUS_MIN_RATE;
  const ceilingNum = Number(params.ceiling ?? BONUS_DEFAULT_CEILING);
  const ceiling = ceilingNum > 0 ? ceilingNum : BONUS_DEFAULT_CEILING;

  const startYear = Number(currentFinancialYear().slice(0, 4));
  const fyOptions = [0, 1, 2].map((back) => {
    const y = startYear - back;
    return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
  });

  const [employees, draftRun] = await Promise.all([
    db.employee.findMany({
      where: { orgId: session.orgId, status: "ACTIVE" },
      orderBy: { name: "asc" },
      include: { salaryStructures: { orderBy: { effectiveFrom: "desc" }, take: 2 } },
    }),
    db.payrollRun.findFirst({
      where: { orgId: session.orgId, status: "DRAFT" },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      include: { payrollAdjustments: true },
    }),
  ]);

  const added = new Set((draftRun?.payrollAdjustments ?? []).map((a) => `${a.employeeId}|${a.name}`));
  const bonusName = `Statutory bonus ${fy}`;

  const bonusRows = employees
    .map((e) => {
      const s = e.salaryStructures[0];
      if (!s) return null;
      const basicPlusDa = Number(s.basic) + Number(s.da);
      if (basicPlusDa > BONUS_ELIGIBILITY_WAGE_LIMIT) return null;
      const months = bonusMonthsInFinancialYear(fy, e.doj, e.dol);
      return { e, basicPlusDa, months, amount: calculateBonus(basicPlusDa, months, rate, ceiling) };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
  const excludedCount = employees.filter((e) => e.salaryStructures[0]).length - bonusRows.length;
  const allBonusAdded = bonusRows.length > 0 && bonusRows.every((r) => added.has(`${r.e.id}|${bonusName}`) || r.amount <= 0);

  const revisedRows = employees
    .filter((e) => e.salaryStructures.length >= 2)
    .map((e) => {
      const [latest, previous] = e.salaryStructures;
      const toGross = (s: typeof latest) =>
        grossFromEarnings({
          basic: Number(s.basic),
          hra: Number(s.hra),
          da: Number(s.da),
          conveyance: Number(s.conveyance),
          medicalAllowance: Number(s.medicalAllowance),
          specialAllowance: Number(s.specialAllowance),
          otherAllowances: (s.otherAllowances as unknown as { name: string; amount: number; basis: "FIXED" | "ATTENDANCE" }[] | null) ?? [],
        });
      return { e, latest, from: toGross(previous), to: toGross(latest) };
    });

  const gratuityRows = employees
    .filter((e) => e.salaryStructures[0])
    .map((e) => ({ e, g: calculateGratuity(Number(e.salaryStructures[0].basic), e.doj, e.dol ?? new Date()) }));

  const draftLabel = draftRun ? `${MONTH_NAMES[draftRun.month - 1]} ${draftRun.year}` : null;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Bonus, arrears &amp; gratuity</h1>

      {draftRun ? (
        <p className="text-sm text-slate-400">
          Everything here is added to the <b className="text-white">{draftLabel}</b> Draft run as a one off earning,
          outside the PF and ESI wage base, and stays editable until you finalize.
        </p>
      ) : (
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-400">
          No payroll run is in Draft.{" "}
          <Link href="/payroll" className="underline">
            Start a run
          </Link>{" "}
          to add these.
        </p>
      )}

      <Card className="overflow-x-auto">
        <h2 className="mb-1 text-lg font-bold text-white">Statutory bonus</h2>
        <p className="mb-4 text-sm text-slate-400">
          Under the Payment of Bonus Act, employees with basic plus DA up to {inr(BONUS_ELIGIBILITY_WAGE_LIMIT)} a
          month are generally eligible for {BONUS_MIN_RATE}% to {BONUS_MAX_RATE}% of wages, calculated on a ceiling of
          the higher of {inr(BONUS_DEFAULT_CEILING)} or the minimum wage. Months are approximated from joining and
          leaving dates. Confirm the rate and ceiling with your CA.
        </p>
        <form method="GET" className="mb-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-400">Financial year</span>
            <select name="fy" defaultValue={fy} className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-white">
              {fyOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-400">Bonus rate (%)</span>
            <input name="rate" type="number" step="0.01" min={BONUS_MIN_RATE} max={BONUS_MAX_RATE} defaultValue={rate} className="h-10 w-28 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-white" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-400">Wage ceiling (₹/month)</span>
            <input name="ceiling" type="number" step="1" min="1" defaultValue={ceiling} className="h-10 w-32 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-white" />
          </label>
          <Button type="submit" variant="secondary">
            Recalculate
          </Button>
        </form>

        {bonusRows.length === 0 ? (
          <p className="text-sm text-slate-500">No active employee is within the eligibility wage limit.</p>
        ) : (
          <>
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="py-2 pr-4">Employee</th>
                  <th className="py-2 pr-4">Basic + DA</th>
                  <th className="py-2 pr-4">Months</th>
                  <th className="py-2 pr-4">Bonus</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {bonusRows.map(({ e, basicPlusDa, months, amount }) => (
                  <tr key={e.id} className="border-b border-slate-800 text-slate-300">
                    <td className="py-2 pr-4 font-medium text-white">
                      {e.name} ({e.employeeCode})
                    </td>
                    <td className="py-2 pr-4">{inr(basicPlusDa)}</td>
                    <td className="py-2 pr-4">{months}</td>
                    <td className="py-2 pr-4 font-semibold text-white">{inr(amount)}</td>
                    <td className="py-2 pr-4">
                      {added.has(`${e.id}|${bonusName}`) ? (
                        <Badge tone="success">Added</Badge>
                      ) : draftRun && amount > 0 ? (
                        <form action={addBonusToDraft.bind(null, e.id)}>
                          <input type="hidden" name="fy" value={fy} />
                          <input type="hidden" name="rate" value={rate} />
                          <input type="hidden" name="ceiling" value={ceiling} />
                          <button type="submit" className="text-sm font-semibold text-amber-400 hover:underline">
                            Add to draft
                          </button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {excludedCount > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                {excludedCount} employee{excludedCount === 1 ? "" : "s"} above the wage limit {excludedCount === 1 ? "is" : "are"} not listed.
              </p>
            )}
            {draftRun && !allBonusAdded && (
              <form action={addAllBonusToDraft} className="mt-3">
                <input type="hidden" name="fy" value={fy} />
                <input type="hidden" name="rate" value={rate} />
                <input type="hidden" name="ceiling" value={ceiling} />
                <Button type="submit">Add bonus for everyone to the draft</Button>
              </form>
            )}
          </>
        )}
      </Card>

      <Card>
        <h2 className="mb-1 text-lg font-bold text-white">Arrears</h2>
        <p className="mb-4 text-sm text-slate-400">
          When a salary revision is effective from an earlier month, pay the difference for the months already paid at
          the old rate. Enter the months and the monthly difference (the revisions below show the difference).
        </p>
        <ArrearsForm employees={employees.map((e) => ({ id: e.id, name: e.name, employeeCode: e.employeeCode }))} />
        {revisedRows.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="py-2 pr-4">Employee</th>
                  <th className="py-2 pr-4">Latest revision effective</th>
                  <th className="py-2 pr-4">Gross per month</th>
                  <th className="py-2 pr-4">Difference</th>
                </tr>
              </thead>
              <tbody>
                {revisedRows.map(({ e, latest, from, to }) => (
                  <tr key={e.id} className="border-b border-slate-800 text-slate-300">
                    <td className="py-2 pr-4 font-medium text-white">{e.name}</td>
                    <td className="py-2 pr-4">{latest.effectiveFrom.toLocaleDateString("en-IN")}</td>
                    <td className="py-2 pr-4">
                      {inr(from)} to {inr(to)}
                    </td>
                    <td className="py-2 pr-4 font-semibold text-white">{inr(to - from)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="overflow-x-auto">
        <h2 className="mb-1 text-lg font-bold text-white">Gratuity</h2>
        <p className="mb-4 text-sm text-slate-400">
          Payable after 5 years of service, at 15 days of basic per completed year. Usually paid when someone leaves,
          so the full and final settlement page is the better place for an exit. Use this to pay it through payroll
          instead. Calculated on basic only, a known simplification.
        </p>
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="py-2 pr-4">Employee</th>
              <th className="py-2 pr-4">Years</th>
              <th className="py-2 pr-4">Accrued</th>
              <th className="py-2 pr-4">Eligibility</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {gratuityRows.map(({ e, g }) => {
              const eligible = g.daysUntilEligible === null;
              return (
                <tr key={e.id} className="border-b border-slate-800 text-slate-300">
                  <td className="py-2 pr-4 font-medium text-white">
                    {e.name} ({e.employeeCode})
                  </td>
                  <td className="py-2 pr-4">{g.completedYears}</td>
                  <td className="py-2 pr-4">{inr(g.accruedAmount)}</td>
                  <td className="py-2 pr-4">
                    <Badge tone={eligible ? "success" : "neutral"}>
                      {eligible ? "Eligible" : `${g.daysUntilEligible} days to go`}
                    </Badge>
                  </td>
                  <td className="py-2 pr-4">
                    {added.has(`${e.id}|Gratuity`) ? (
                      <Badge tone="success">Added</Badge>
                    ) : eligible && draftRun ? (
                      <form action={addGratuityToDraft.bind(null, e.id)}>
                        <button type="submit" className="text-sm font-semibold text-amber-400 hover:underline">
                          Add to draft
                        </button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
