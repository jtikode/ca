import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";

export default async function AuditLogPage() {
  const session = await requireSession(["SUPERADMIN"]);

  const entries = await db.auditLog.findMany({
    where: { orgId: session.orgId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Audit log</h1>

      <Card className="overflow-x-auto">
        <p className="mb-4 text-sm text-slate-400">
          Who changed what, newest first. Covers salary changes, statutory toggles, payroll finalize/revert/discard,
          approvals, loans, assets, holidays, certificates and settings. Showing the latest 200 entries.
        </p>
        {entries.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing recorded yet. Entries appear as changes are made.</p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="py-2 pr-4">When</th>
                <th className="py-2 pr-4">Who</th>
                <th className="py-2 pr-4">What</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-slate-800 text-slate-300">
                  <td className="whitespace-nowrap py-2 pr-4 text-slate-400">
                    {e.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}
                  </td>
                  <td className="py-2 pr-4 font-medium text-white">{e.actorName}</td>
                  <td className="py-2 pr-4">{e.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
