import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AddAssetForm } from "@/components/common/InlineForms";
import { assignAsset, returnAsset, deleteAsset } from "@/actions/assetActions";

export default async function AssetsPage() {
  const session = await requireSession(["SUPERADMIN", "HR_MANAGER"]);

  const [assets, employees] = await Promise.all([
    db.asset.findMany({
      where: { orgId: session.orgId },
      orderBy: { createdAt: "desc" },
      include: { assignedTo: { select: { name: true, employeeCode: true } } },
    }),
    db.employee.findMany({
      where: { orgId: session.orgId, status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, employeeCode: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Company assets</h1>

      <Card>
        <h2 className="mb-1 text-lg font-bold text-white">Add an asset</h2>
        <p className="mb-4 text-sm text-slate-400">
          Laptops, phones, ID cards, keys. Assigning an asset records who holds it, and the offboarding checklist
          shows anything still assigned when someone leaves.
        </p>
        <AddAssetForm />
      </Card>

      <Card className="overflow-x-auto">
        <h2 className="mb-4 text-lg font-bold text-white">All assets</h2>
        {assets.length === 0 ? (
          <p className="text-sm text-slate-400">No assets yet.</p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="py-2 pr-4">Asset</th>
                <th className="py-2 pr-4">Serial</th>
                <th className="py-2 pr-4">Held by</th>
                <th className="py-2 pr-4"></th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id} className="border-b border-slate-800 text-slate-300">
                  <td className="py-2 pr-4 font-medium text-white">{a.name}</td>
                  <td className="py-2 pr-4 text-slate-400">{a.serialNo ?? "-"}</td>
                  <td className="py-2 pr-4">
                    {a.assignedTo ? (
                      <span>
                        {a.assignedTo.name} ({a.assignedTo.employeeCode})
                      </span>
                    ) : (
                      <Badge tone="neutral">In stock</Badge>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {a.assignedTo ? (
                      <form action={returnAsset.bind(null, a.id)}>
                        <button type="submit" className="text-sm font-semibold text-amber-400 hover:underline">
                          Mark returned
                        </button>
                      </form>
                    ) : (
                      <form action={assignAsset.bind(null, a.id)} className="flex items-center gap-2">
                        <select
                          name="employeeId"
                          required
                          defaultValue=""
                          className="h-8 rounded border border-slate-700 bg-slate-900 px-2 text-xs text-white"
                        >
                          <option value="" disabled>
                            Assign to...
                          </option>
                          {employees.map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.name} ({e.employeeCode})
                            </option>
                          ))}
                        </select>
                        <button type="submit" className="text-xs font-semibold text-amber-400 hover:underline">
                          Assign
                        </button>
                      </form>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <form action={deleteAsset.bind(null, a.id)}>
                      <button type="submit" className="text-sm font-semibold text-red-400 hover:underline">
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
