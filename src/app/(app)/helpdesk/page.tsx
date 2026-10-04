import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TicketResponseForm } from "@/components/common/InlineForms";

export default async function HelpdeskPage() {
  const session = await requireSession(["SUPERADMIN", "HR_MANAGER"]);

  const [open, resolved] = await Promise.all([
    db.helpdeskTicket.findMany({
      where: { orgId: session.orgId, status: "OPEN" },
      orderBy: { createdAt: "asc" },
      include: { employee: { select: { name: true, employeeCode: true } } },
    }),
    db.helpdeskTicket.findMany({
      where: { orgId: session.orgId, status: "RESOLVED" },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { employee: { select: { name: true, employeeCode: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Employee helpdesk</h1>

      <Card>
        <h2 className="mb-4 text-lg font-bold text-white">Open tickets</h2>
        {open.length === 0 ? (
          <p className="text-sm text-slate-500">No open tickets.</p>
        ) : (
          <div className="space-y-4">
            {open.map((t) => (
              <div key={t.id} className="rounded-xl border border-slate-800 bg-ink-950/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-white">{t.subject}</div>
                  <span className="text-xs text-slate-500">
                    {t.employee.name} ({t.employee.employeeCode}) · {t.createdAt.toLocaleDateString("en-IN")}
                  </span>
                </div>
                <p className="mt-1 mb-3 text-sm text-slate-300">{t.message}</p>
                <TicketResponseForm ticketId={t.id} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-bold text-white">Recently resolved</h2>
        {resolved.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing resolved yet.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {resolved.map((t) => (
              <li key={t.id} className="border-b border-slate-800 pb-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-white">{t.subject}</span>
                  <Badge tone="success">RESOLVED</Badge>
                </div>
                <div className="text-xs text-slate-500">
                  {t.employee.name} ({t.employee.employeeCode})
                </div>
                <p className="mt-1 text-slate-400">Reply: {t.response}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
