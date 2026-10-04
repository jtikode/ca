import { notFound } from "next/navigation";
import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TicketForm } from "@/components/common/InlineForms";

export default async function MyHelpdeskPage() {
  const session = await requireSession(["EMPLOYEE"]);
  if (!session.employeeId) notFound();

  const tickets = await db.helpdeskTicket.findMany({
    where: { employeeId: session.employeeId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Helpdesk</h1>

      <Card>
        <h2 className="mb-1 text-lg font-bold text-white">Ask HR</h2>
        <p className="mb-4 text-sm text-slate-400">A payslip question, a document request, anything HR can help with.</p>
        <TicketForm />
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-bold text-white">My tickets</h2>
        {tickets.length === 0 ? (
          <p className="text-sm text-slate-400">No tickets yet.</p>
        ) : (
          <ul className="space-y-4">
            {tickets.map((t) => (
              <li key={t.id} className="border-b border-slate-800 pb-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-white">{t.subject}</span>
                  <Badge tone={t.status === "OPEN" ? "warning" : "success"}>{t.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-300">{t.message}</p>
                {t.response && (
                  <p className="mt-2 rounded-lg bg-slate-800/60 px-3 py-2 text-sm text-slate-200">
                    HR replied: {t.response}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
