import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AddClientForm } from "@/components/common/AddClientForm";
import { switchOrganization } from "@/actions/clientActions";
import { listAccessibleOrgs } from "@/lib/clients";
import { detectComplianceGaps } from "@/lib/compliance";
import { MONTH_NAMES } from "@/lib/dates";

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ added?: string }> }) {
  const session = await requireSession(["SUPERADMIN", "HR_MANAGER"]);
  const { added } = await searchParams;

  const orgs = await listAccessibleOrgs(session.userId);

  const rows = await Promise.all(
    orgs.map(async (o) => {
      const [employees, lastRun, gaps] = await Promise.all([
        db.employee.count({ where: { orgId: o.id, status: "ACTIVE" } }),
        db.payrollRun.findFirst({ where: { orgId: o.id }, orderBy: [{ year: "desc" }, { month: "desc" }] }),
        detectComplianceGaps(o.id),
      ]);
      return { o, employees, lastRun, gaps };
    }),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Client companies</h1>
      {added === "1" && (
        <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-400">
          Client company added. Open it below to set it up.
        </p>
      )}

      <Card className="overflow-x-auto">
        <p className="mb-4 text-sm text-slate-400">
          One login for every company you handle payroll for. Open a company to work inside it, and use the company
          switcher at the top to move between them.
        </p>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="py-2 pr-4">Company</th>
              <th className="py-2 pr-4">Employees</th>
              <th className="py-2 pr-4">Last payroll run</th>
              <th className="py-2 pr-4">Compliance flags</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ o, employees, lastRun, gaps }) => (
              <tr key={o.id} className="border-b border-slate-800 text-slate-300">
                <td className="py-2 pr-4 font-medium text-white">
                  {o.name} {o.id === session.orgId && <Badge tone="info">Current</Badge>}
                </td>
                <td className="py-2 pr-4">{employees}</td>
                <td className="py-2 pr-4">
                  {lastRun ? (
                    <>
                      {MONTH_NAMES[lastRun.month - 1]} {lastRun.year}{" "}
                      <Badge tone={lastRun.status === "FINALIZED" ? "success" : "warning"}>{lastRun.status}</Badge>
                    </>
                  ) : (
                    <span className="text-slate-500">None yet</span>
                  )}
                </td>
                <td className="py-2 pr-4">
                  {gaps.length === 0 ? (
                    <Badge tone="success">Clear</Badge>
                  ) : (
                    <Badge tone={gaps.some((g) => g.severity === "danger") ? "danger" : "warning"}>
                      {gaps.length} flagged
                    </Badge>
                  )}
                </td>
                <td className="py-2 pr-4">
                  {o.id !== session.orgId && (
                    <form action={switchOrganization}>
                      <input type="hidden" name="orgId" value={o.id} />
                      <button type="submit" className="text-sm font-semibold text-amber-400 hover:underline">
                        Open
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {session.role === "SUPERADMIN" && (
        <Card>
          <h2 className="mb-1 text-lg font-bold text-white">Add a client company</h2>
          <p className="mb-4 text-sm text-slate-400">
            Creates a separate company that you manage from this same login. Its data stays isolated from your other
            companies.
          </p>
          <AddClientForm />
        </Card>
      )}
    </div>
  );
}
