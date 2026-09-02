import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Users,
  Calculator,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  ShieldAlert,
  FileSpreadsheet,
  Lock,
  ArrowUpRight,
  Building2,
  type LucideIcon,
} from "lucide-react";
import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PayrollCharts, type CostBreakdownSlice, type MonthlyTotal } from "@/components/dashboard/PayrollCharts";
import { StatutoryWidget } from "@/components/dashboard/StatutoryWidget";
import { finalizePayrollRun } from "@/actions/payrollActions";
import {
  MONTH_NAMES,
  currentFinancialYear,
  financialYearAndQuarterFor,
  quarterLabel,
  upcomingStatutoryDeadlines,
  daysUntil,
  nextBirthday,
} from "@/lib/dates";

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

const PRIMARY_LINK_CLASSES =
  "inline-flex h-10 items-center justify-center rounded-lg bg-amber-500 px-4 text-sm font-semibold text-slate-950 shadow-[0_0_20px_-6px_rgba(245,158,11,0.5)] transition hover:bg-amber-400";
const SECONDARY_LINK_CLASSES =
  "inline-flex h-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-4 text-sm font-semibold text-white transition hover:bg-slate-700";

export default async function DashboardPage() {
  const session = await requireSession();
  if (session.role === "EMPLOYEE") redirect("/my-payslips");

  const [employeeCount, lastRun, pendingApprovalCount, myRequests, org] = await Promise.all([
    db.employee.count({ where: { orgId: session.orgId, status: "ACTIVE" } }),
    db.payrollRun.findFirst({
      where: { orgId: session.orgId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      include: { payslipLines: { include: { employee: { select: { storeId: true } } } } },
    }),
    session.role === "SUPERADMIN"
      ? db.approvalRequest.count({ where: { orgId: session.orgId, status: "PENDING" } })
      : Promise.resolve(0),
    session.role === "HR_MANAGER"
      ? db.approvalRequest.findMany({
          where: { orgId: session.orgId, requestedById: session.userId, status: "PENDING" },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      : Promise.resolve([]),
    db.organization.findUnique({
      where: { id: session.orgId },
      select: { pan: true, tan: true, multiLocationEnabled: true },
    }),
  ]);

  const stores = org?.multiLocationEnabled
    ? await db.store.findMany({
        where: { orgId: session.orgId },
        orderBy: { name: "asc" },
        include: { _count: { select: { employees: true } } },
      })
    : [];
  const netPayByStore = new Map<string, number>();
  if (lastRun) {
    for (const line of lastRun.payslipLines) {
      const storeId = line.employee.storeId;
      if (!storeId) continue;
      netPayByStore.set(storeId, (netPayByStore.get(storeId) ?? 0) + Number(line.netPay));
    }
  }

  const certificates = await db.certificate.findMany({
    where: { orgId: session.orgId },
    orderBy: { expiryDate: "asc" },
    take: 5,
  });

  const employeesWithDob = await db.employee.findMany({
    where: { orgId: session.orgId, status: "ACTIVE", dob: { not: null } },
    select: { name: true, dob: true },
  });
  const upcomingBirthday = employeesWithDob
    .map((e) => ({ name: e.name, date: nextBirthday(e.dob!) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

  const statutoryEmployees = await db.employee.findMany({
    where: { orgId: session.orgId, status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, pfApplicable: true, esiApplicable: true },
  });

  const [latestFinalizedRun, recentFinalizedRuns] = await Promise.all([
    db.payrollRun.findFirst({
      where: { orgId: session.orgId, status: "FINALIZED" },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      include: { payslipLines: true },
    }),
    db.payrollRun.findMany({
      where: { orgId: session.orgId, status: "FINALIZED" },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 12,
      include: { payslipLines: { select: { netPay: true } } },
    }),
  ]);

  let costBreakdown: CostBreakdownSlice[] = [];
  if (latestFinalizedRun) {
    const totals = latestFinalizedRun.payslipLines.reduce(
      (acc, line) => ({
        net: acc.net + Number(line.netPay),
        employeePfEsi: acc.employeePfEsi + Number(line.pfEmployee) + Number(line.esiEmployee),
        employerPfEsi: acc.employerPfEsi + Number(line.pfEmployer) + Number(line.esiEmployer),
        pt: acc.pt + Number(line.ptAmount),
        tds: acc.tds + Number(line.tdsAmount),
      }),
      { net: 0, employeePfEsi: 0, employerPfEsi: 0, pt: 0, tds: 0 },
    );
    costBreakdown = [
      { name: "Net pay", value: totals.net },
      { name: "Employee PF+ESI", value: totals.employeePfEsi },
      { name: "Employer PF+ESI", value: totals.employerPfEsi },
      { name: "PT", value: totals.pt },
      { name: "TDS", value: totals.tds },
    ].filter((s) => s.value > 0);
  }

  const monthlyTotals: MonthlyTotal[] = [...recentFinalizedRuns]
    .reverse()
    .map((run) => ({
      label: `${MONTH_NAMES[run.month - 1].slice(0, 3)} ${run.year}`,
      total: run.payslipLines.reduce((sum, l) => sum + Number(l.netPay), 0),
    }));

  const heroTotals = lastRun
    ? lastRun.payslipLines.reduce(
        (acc, l) => ({
          gross: acc.gross + Number(l.grossEarnings),
          statutory: acc.statutory + Number(l.pfEmployee) + Number(l.esiEmployee) + Number(l.ptAmount) + Number(l.tdsAmount),
          net: acc.net + Number(l.netPay),
        }),
        { gross: 0, statutory: 0, net: 0 },
      )
    : null;
  const heroIsDraft = lastRun?.status === "DRAFT";

  type Stat = { label: string; value: string; sub: string; icon: LucideIcon; color: string; href: string };
  const stats: Stat[] = [
    {
      label: "Active employees",
      value: String(employeeCount),
      sub: "Manage employees",
      icon: Users,
      color: "bg-blue-600",
      href: "/employees",
    },
    {
      label: "Last payroll run",
      value: lastRun ? `${MONTH_NAMES[lastRun.month - 1].slice(0, 3)} ${lastRun.year}` : "None yet",
      sub: lastRun ? "View payroll" : "Run your first payroll",
      icon: Calculator,
      color: "bg-amber-500",
      href: "/payroll",
    },
    session.role === "SUPERADMIN"
      ? {
          label: "Pending approvals",
          value: String(pendingApprovalCount),
          sub: "Review approvals",
          icon: AlertCircle,
          color: "bg-rose-500",
          href: "/approvals",
        }
      : {
          label: "Status",
          value: lastRun?.status === "FINALIZED" ? "Finalized" : lastRun ? "Draft" : "—",
          sub: "Latest payroll run",
          icon: CheckCircle2,
          color: "bg-emerald-600",
          href: "/payroll",
        },
  ];

  const fy = currentFinancialYear();
  const now = new Date();
  const quarter = financialYearAndQuarterFor(now.getMonth() + 1, now.getFullYear()).quarter;
  const hasPanTan = Boolean(org?.pan && org?.tan);
  const deadlines = upcomingStatutoryDeadlines();

  function urgencyTone(daysRemaining: number): "danger" | "warning" | "success" {
    if (daysRemaining <= 3) return "danger";
    if (daysRemaining <= 10) return "warning";
    return "success";
  }

  function formatDue(date: Date): string {
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }

  return (
    <div className="space-y-6">
      <div className="mb-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
            <span>Overview</span>
            <span className="text-slate-700">/</span>
            <span className="text-amber-400/80">Payroll</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-400">
            FY {fy}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-emerald-400" />
            Operational
          </span>
        </div>
      </div>

      {upcomingBirthday && (
        <p className="flex items-center gap-2 text-sm text-slate-400">
          <span aria-hidden>🎂</span>
          Upcoming birthday: <span className="font-semibold text-white">{upcomingBirthday.name}</span> —{" "}
          {formatDue(upcomingBirthday.date)} ({daysUntil(upcomingBirthday.date)} day
          {daysUntil(upcomingBirthday.date) === 1 ? "" : "s"})
        </p>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-black/20 transition-all duration-300 hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-900"
          >
            <div className="mb-5 flex items-start justify-between">
              <span className="text-sm text-slate-400">{s.label}</span>
              <div className={`rounded-lg p-2 shadow-lg ${s.color} transition-transform duration-300 group-hover:scale-110`}>
                <s.icon size={18} className="text-white" />
              </div>
            </div>
            <div className="text-3xl font-extrabold tracking-tight text-white">{s.value}</div>
            <div className="mt-1 text-xs font-semibold text-amber-400">{s.sub}</div>
          </Link>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="space-y-6 lg:col-span-8">
          <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-ink-900 p-6 shadow-2xl shadow-black/30 sm:p-7">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" />

            <div className="mb-6 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20">
                  <Calculator size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white sm:text-xl">Payroll</h2>
                  <p className="text-xs text-slate-500">
                    {lastRun ? `${MONTH_NAMES[lastRun.month - 1]} ${lastRun.year}` : "No run yet"}
                  </p>
                </div>
              </div>
              {lastRun && <Badge tone={heroIsDraft ? "warning" : "success"}>{heroIsDraft ? "Draft" : "Finalized"}</Badge>}
            </div>

            {lastRun && heroTotals ? (
              <>
                <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    { label: "Gross Computed", value: inr(heroTotals.gross) },
                    { label: "Statutory Deducted", value: inr(heroTotals.statutory) },
                    { label: "Net Payable", value: inr(heroTotals.net) },
                  ].map((m) => (
                    <div key={m.label} className="rounded-xl border border-slate-800 bg-ink-950/70 p-4 transition-colors hover:border-slate-700">
                      <div className="mb-1 text-xs text-slate-500">{m.label}</div>
                      <div className="text-lg font-bold tracking-tight text-white sm:text-xl">{m.value}</div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  {heroIsDraft ? (
                    <form action={finalizePayrollRun.bind(null, lastRun.id)}>
                      <Button type="submit">Finalize Payroll Run</Button>
                    </form>
                  ) : (
                    <Link href={`/payroll/${lastRun.id}/export`} className={PRIMARY_LINK_CLASSES}>
                      Download CA Export
                    </Link>
                  )}
                  <Link href={`/payroll/${lastRun.id}`} className={SECONDARY_LINK_CLASSES}>
                    View full run
                  </Link>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-slate-400">No payroll run found yet.</p>
                <Link href="/payroll" className={PRIMARY_LINK_CLASSES}>
                  Run your first payroll
                </Link>
              </div>
            )}
          </div>

          {latestFinalizedRun && (
            <Card>
              <h2 className="mb-4 text-lg font-bold text-white">Payroll trends</h2>
              <PayrollCharts costBreakdown={costBreakdown} monthlyTotals={monthlyTotals} />
            </Card>
          )}

          {session.role === "HR_MANAGER" && myRequests.length > 0 && (
            <Card>
              <h2 className="mb-3 text-lg font-bold text-white">Your pending requests</h2>
              <ul className="space-y-2 text-sm text-slate-300">
                {myRequests.map((req) => (
                  <li key={req.id} className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span>{req.type === "CREATE_EMPLOYEE" ? "Add employee" : "Salary change"} — awaiting approval</span>
                    <Badge tone="warning">Pending</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {employeeCount === 0 && (
            <Card>
              <h2 className="text-lg font-bold text-white">Get started</h2>
              <p className="mt-1 text-sm text-slate-400">
                Add your employees, then run your first payroll and export a package for your CA.
              </p>
              <Link href="/employees" className={`mt-3 inline-flex ${PRIMARY_LINK_CLASSES}`}>
                Add employees
              </Link>
            </Card>
          )}
        </section>

        <aside className="space-y-6 lg:col-span-4">
          <Card>
            <h3 className="mb-4 text-lg font-bold text-white">Statutory Reports</h3>
            <ul className="space-y-3">
              <li className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-ink-950/70 p-3 transition-colors hover:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-400 ring-1 ring-slate-700">
                    <FileSpreadsheet size={15} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Form 16 Part B</div>
                    <div className="text-xs text-slate-500">FY {fy}</div>
                  </div>
                </div>
                {hasPanTan ? (
                  <a
                    href={`/api/reports/form16?fy=${fy}`}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] text-slate-300 transition hover:border-slate-600 hover:bg-slate-700 hover:text-white"
                  >
                    Download ZIP <ArrowUpRight size={11} />
                  </a>
                ) : (
                  <Link
                    href="/settings"
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/60 px-2 py-1 text-[11px] text-slate-500"
                  >
                    <Lock size={11} /> Add PAN/TAN
                  </Link>
                )}
              </li>
              <li className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-ink-950/70 p-3 transition-colors hover:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-400 ring-1 ring-slate-700">
                    <FileSpreadsheet size={15} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Form 24Q</div>
                    <div className="text-xs text-slate-500">{quarterLabel(fy, quarter)}</div>
                  </div>
                </div>
                <a
                  href={`/api/reports/form24q?fy=${fy}&quarter=${quarter}`}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] text-slate-300 transition hover:border-slate-600 hover:bg-slate-700 hover:text-white"
                >
                  Download Excel <ArrowUpRight size={11} />
                </a>
              </li>
              <li className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-ink-950/70 p-3 transition-colors hover:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-400 ring-1 ring-slate-700">
                    <FileSpreadsheet size={15} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">PF / ESI / PT Annual</div>
                    <div className="text-xs text-slate-500">FY {fy}</div>
                  </div>
                </div>
                <a
                  href={`/api/reports/annual-statutory?fy=${fy}`}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] text-slate-300 transition hover:border-slate-600 hover:bg-slate-700 hover:text-white"
                >
                  Download Excel <ArrowUpRight size={11} />
                </a>
              </li>
            </ul>
            <Link href="/reports" className="mt-3 inline-block text-xs font-semibold text-amber-400 hover:underline">
              View all reports →
            </Link>
          </Card>

          {org?.multiLocationEnabled && stores.length > 0 && (
            <Card>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20">
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">By Store</h3>
                  <p className="text-xs text-slate-500">Headcount &amp; latest run</p>
                </div>
              </div>
              <ul className="space-y-2.5">
                {stores.map((store) => (
                  <li
                    key={store.id}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-ink-950/70 p-3 transition-colors hover:border-slate-700"
                  >
                    <div>
                      <div className="text-sm font-semibold text-white">{store.name}</div>
                      <div className="text-xs text-slate-500">{store._count.employees} employees</div>
                    </div>
                    <span className="text-sm font-semibold text-slate-300">
                      {netPayByStore.has(store.id) ? inr(netPayByStore.get(store.id)!) : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20">
                <CalendarDays size={18} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Compliance Calendar</h3>
                <p className="text-xs text-slate-500">Indicative — confirm with your CA</p>
              </div>
            </div>
            <ul className="space-y-2.5">
              {deadlines.map((d) => (
                <li
                  key={d.title}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-ink-950/70 p-3 transition-colors hover:border-slate-700"
                >
                  <div>
                    <div className="text-sm font-semibold text-white">{d.title}</div>
                    <div className="text-xs text-slate-500">Due {formatDue(d.dueDate)}</div>
                  </div>
                  <Badge tone={urgencyTone(d.daysRemaining)}>
                    {d.daysRemaining <= 0 ? "Due today" : `${d.daysRemaining} day${d.daysRemaining === 1 ? "" : "s"}`}
                  </Badge>
                </li>
              ))}
              <li className="flex items-center justify-between rounded-xl border border-slate-800 bg-ink-950/70 p-3">
                <div>
                  <div className="text-sm font-semibold text-white">Professional Tax</div>
                  <div className="text-xs text-slate-500">Due date varies by state</div>
                </div>
                <Badge tone="neutral">Check portal</Badge>
              </li>
            </ul>
          </Card>

          {certificates.length > 0 && (
            <Card>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Certificate Expiry</h3>
                  <p className="text-xs text-slate-500">Company certificates &amp; registrations</p>
                </div>
              </div>
              <ul className="space-y-2.5">
                {certificates.map((cert) => {
                  const remaining = daysUntil(cert.expiryDate);
                  return (
                    <li
                      key={cert.id}
                      className="flex items-center justify-between rounded-xl border border-slate-800 bg-ink-950/70 p-3 transition-colors hover:border-slate-700"
                    >
                      <div>
                        <div className="text-sm font-semibold text-white">{cert.name}</div>
                        <div className="text-xs text-slate-500">Expires {formatDue(cert.expiryDate)}</div>
                      </div>
                      <Badge tone={urgencyTone(remaining)}>
                        {remaining <= 0 ? "Expired" : `${remaining} day${remaining === 1 ? "" : "s"}`}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
              <Link href="/settings" className="mt-3 inline-block text-xs font-semibold text-amber-400 hover:underline">
                Manage certificates →
              </Link>
            </Card>
          )}

          <StatutoryWidget employees={statutoryEmployees} />

          <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-b from-amber-500/10 to-slate-900/40 p-6">
            <div className="mb-2 flex items-center gap-2">
              <ShieldAlert size={16} className="text-amber-400" />
              <h3 className="text-sm font-bold text-amber-400">Compliance Note</h3>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              Figures shown are computed estimates. Final statutory filing must be verified by your Chartered
              Accountant and submitted via the official EPFO / ESIC / NSDL / TRACES / state PT portals. TimHr does
              not e-file on your behalf.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
