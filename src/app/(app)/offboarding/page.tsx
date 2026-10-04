import Link from "next/link";
import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { startOffboarding, toggleOffboardingItem, clearOffboarding } from "@/actions/offboardingActions";

export default async function OffboardingPage() {
  const session = await requireSession(["SUPERADMIN", "HR_MANAGER"]);

  const [items, employees, heldAssets] = await Promise.all([
    db.offboardingItem.findMany({
      where: { orgId: session.orgId },
      orderBy: { createdAt: "asc" },
      include: { employee: { select: { id: true, name: true, employeeCode: true } } },
    }),
    db.employee.findMany({
      where: { orgId: session.orgId, status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, employeeCode: true },
    }),
    db.asset.findMany({ where: { orgId: session.orgId, assignedToId: { not: null } } }),
  ]);

  const byEmployee = new Map<string, { employee: (typeof items)[number]["employee"]; items: typeof items }>();
  for (const item of items) {
    const entry = byEmployee.get(item.employeeId) ?? { employee: item.employee, items: [] };
    entry.items.push(item);
    byEmployee.set(item.employeeId, entry);
  }
  const startable = employees.filter((e) => !byEmployee.has(e.id));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Offboarding</h1>

      <Card>
        <h2 className="mb-1 text-lg font-bold text-white">Start an exit checklist</h2>
        <p className="mb-4 text-sm text-slate-400">
          Creates a standard checklist (handover, assets, final settlement, relieving letter, access removal) for
          someone who is leaving. Set their date of leaving on their employee page to generate the experience and
          relieving letters.
        </p>
        <form action={startOffboarding} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-400">Employee</span>
            <select
              name="employeeId"
              required
              defaultValue=""
              className="h-10 w-64 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-white"
            >
              <option value="" disabled>
                Select employee
              </option>
              {startable.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.employeeCode})
                </option>
              ))}
            </select>
          </label>
          <Button type="submit">Start checklist</Button>
        </form>
      </Card>

      {[...byEmployee.values()].map(({ employee, items: list }) => {
        const doneCount = list.filter((i) => i.done).length;
        const assetsHeld = heldAssets.filter((a) => a.assignedToId === employee.id);
        return (
          <Card key={employee.id}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {employee.name} ({employee.employeeCode})
                </h2>
                <p className="text-xs text-slate-500">
                  {doneCount} of {list.length} done ·{" "}
                  <Link href={`/employees/${employee.id}`} className="text-amber-400 hover:underline">
                    Employee page
                  </Link>
                </p>
              </div>
              <form action={clearOffboarding.bind(null, employee.id)}>
                <button type="submit" className="text-sm font-semibold text-red-400 hover:underline">
                  Remove checklist
                </button>
              </form>
            </div>

            {assetsHeld.length > 0 && (
              <p className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-400">
                Still holding {assetsHeld.length} asset{assetsHeld.length === 1 ? "" : "s"}:{" "}
                {assetsHeld.map((a) => a.name).join(", ")}.{" "}
                <Link href="/assets" className="underline">
                  Go to assets
                </Link>
              </p>
            )}

            <ul className="space-y-2">
              {list.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2 text-sm">
                  <span className={item.done ? "text-slate-500 line-through" : "text-slate-200"}>{item.title}</span>
                  <form action={toggleOffboardingItem.bind(null, item.id, !item.done)}>
                    <button type="submit" className="text-xs font-semibold text-amber-400 hover:underline">
                      {item.done ? "Undo" : "Mark done"}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
            {doneCount === list.length && <Badge tone="success" className="mt-3">All steps complete</Badge>}
          </Card>
        );
      })}
    </div>
  );
}
