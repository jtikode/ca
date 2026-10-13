import Link from "next/link";
import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { recordSettlement } from "@/actions/settlementActions";
import { buildSettlement, parseSettlementInput, type SettlementResult } from "@/lib/settlement";

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

const INPUT = "h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-white";

function Statement({ result }: { result: SettlementResult }) {
  return (
    <div className="space-y-2 text-sm">
      {result.lines.map((l) => (
        <div key={l.label} className="flex items-start justify-between gap-4 border-b border-slate-800 pb-2">
          <div>
            <div className="text-slate-200">{l.label}</div>
            {l.note && <div className="text-xs text-slate-500">{l.note}</div>}
          </div>
          <div className={l.type === "EARNING" ? "text-emerald-400" : "text-red-400"}>
            {l.type === "EARNING" ? "+" : "-"}
            {inr(l.amount)}
          </div>
        </div>
      ))}
      <div className="flex justify-between pt-1 text-base font-bold text-white">
        <span>Net payable to the employee</span>
        <span>{inr(result.net)}</span>
      </div>
    </div>
  );
}

export default async function SettlementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireSession(["SUPERADMIN", "HR_MANAGER"]);
  const params = await searchParams;

  const [employees, history] = await Promise.all([
    db.employee.findMany({
      where: { orgId: session.orgId, status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, employeeCode: true },
    }),
    db.finalSettlement.findMany({
      where: { orgId: session.orgId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { employee: { select: { name: true, employeeCode: true } } },
    }),
  ]);

  const input = params.employeeId ? parseSettlementInput((k) => params[k]) : null;
  const result = input ? await buildSettlement(session.orgId, input) : null;
  const wasSaved = params.saved === "1";

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Full and final settlement</h1>
      {wasSaved && (
        <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-400">
          Settlement recorded.
        </p>
      )}

      <Card>
        <h2 className="mb-1 text-lg font-bold text-white">Calculate</h2>
        <p className="mb-4 text-sm text-slate-400">
          Pick who is leaving and fill in what applies. Nothing is saved until you record it.
        </p>
        <form method="GET" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs font-medium text-slate-400">Employee</span>
            <select name="employeeId" required defaultValue={params.employeeId ?? ""} className={INPUT}>
              <option value="" disabled>
                Select employee
              </option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.employeeCode})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-400">Last working day</span>
            <input name="lastWorkingDay" type="date" required defaultValue={params.lastWorkingDay ?? ""} className={INPUT} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-400">Days of final month to pay</span>
            <input name="daysToPay" type="number" min="0" step="0.5" placeholder="Day of month by default" defaultValue={params.daysToPay ?? ""} className={INPUT} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-400">Notice pay in lieu (days)</span>
            <input name="noticePayDays" type="number" min="0" step="0.5" defaultValue={params.noticePayDays ?? ""} className={INPUT} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-400">Notice shortfall to recover (days)</span>
            <input name="noticeRecoveryDays" type="number" min="0" step="0.5" defaultValue={params.noticeRecoveryDays ?? ""} className={INPUT} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-400">Leave to encash (days)</span>
            <input name="leaveEncashDays" type="number" min="0" step="0.5" defaultValue={params.leaveEncashDays ?? ""} className={INPUT} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-400">Other dues (₹)</span>
            <input name="otherEarnings" type="number" min="0" step="1" defaultValue={params.otherEarnings ?? ""} className={INPUT} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-400">Other deductions (₹)</span>
            <input name="otherDeductions" type="number" min="0" step="1" defaultValue={params.otherDeductions ?? ""} className={INPUT} />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" name="includeGratuity" value="on" defaultChecked={params.includeGratuity !== "off"} className="h-4 w-4" />
            Include gratuity if eligible
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" name="recoverLoans" value="on" defaultChecked={params.recoverLoans !== "off"} className="h-4 w-4" />
            Recover outstanding loans
          </label>
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit">Calculate</Button>
          </div>
        </form>
      </Card>

      {result && input && (
        <Card>
          <h2 className="mb-1 text-lg font-bold text-white">
            {result.employee.name} ({result.employee.employeeCode})
          </h2>
          <p className="mb-4 text-sm text-slate-400">
            Last working day {new Date(result.lastWorkingDay).toLocaleDateString("en-IN")}
          </p>
          <Statement result={result} />
          <p className="mt-3 text-xs text-slate-500">
            Income tax on leave encashment or gratuity above the exempt limits is not computed here. Confirm tax and
            the figures with your CA before paying.
          </p>
          <form action={recordSettlement} className="mt-4">
            {Object.entries({
              employeeId: params.employeeId,
              lastWorkingDay: params.lastWorkingDay,
              daysToPay: params.daysToPay,
              noticePayDays: params.noticePayDays,
              noticeRecoveryDays: params.noticeRecoveryDays,
              leaveEncashDays: params.leaveEncashDays,
              otherEarnings: params.otherEarnings,
              otherDeductions: params.otherDeductions,
              includeGratuity: params.includeGratuity === "off" ? "off" : "on",
              recoverLoans: params.recoverLoans === "off" ? "off" : "on",
            }).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v ?? ""} />
            ))}
            <Button type="submit">Record this settlement</Button>
            <p className="mt-2 text-xs text-slate-500">
              Recording sets the date of leaving on the employee, which unlocks the experience and relieving letters,
              and cancels any loan recovered above. It does not deactivate the employee or move any money.
            </p>
          </form>
        </Card>
      )}

      <Card>
        <h2 className="mb-4 text-lg font-bold text-white">Recorded settlements</h2>
        {history.length === 0 ? (
          <p className="text-sm text-slate-500">None recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {history.map((h) => (
              <details key={h.id} className="rounded-xl border border-slate-800 bg-ink-950/70 p-3">
                <summary className="cursor-pointer text-sm text-slate-200">
                  <span className="font-semibold text-white">
                    {h.employee.name} ({h.employee.employeeCode})
                  </span>{" "}
                  · last day {h.lastWorkingDay.toLocaleDateString("en-IN")} · net {inr(Number(h.netPayable))}
                </summary>
                <div className="mt-3">
                  <Statement result={h.breakdown as unknown as SettlementResult} />
                  <Link href={`/employees/${h.employeeId}`} className="mt-2 inline-block text-xs font-semibold text-amber-400 hover:underline">
                    Employee page (letters)
                  </Link>
                </div>
              </details>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
