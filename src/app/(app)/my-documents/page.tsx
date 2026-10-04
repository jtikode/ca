import { notFound } from "next/navigation";
import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { acknowledgePolicy } from "@/actions/policyActions";

const CATEGORY_LABELS: Record<string, string> = {
  TRAINING: "Training",
  CHECKLIST: "Checklist",
  DOCUMENT: "Document",
  POLICY: "Policy",
};

const CATEGORY_TONES: Record<string, "info" | "warning" | "neutral" | "danger"> = {
  TRAINING: "info",
  CHECKLIST: "warning",
  DOCUMENT: "neutral",
  POLICY: "danger",
};

export default async function MyDocumentsPage() {
  const session = await requireSession(["EMPLOYEE"]);
  if (!session.employeeId) notFound();

  const documents = await db.companyDocument.findMany({
    where: { orgId: session.orgId, visibleTo: { some: { id: session.employeeId } } },
    orderBy: { createdAt: "desc" },
    include: { acknowledgements: { where: { employeeId: session.employeeId }, select: { id: true } } },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">My Documents</h1>

      <Card className="overflow-x-auto">
        {documents.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">Nothing has been shared with you yet.</p>
        ) : (
          <table className="w-full min-w-[400px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="py-2 pr-4">Title</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b border-slate-800">
                  <td className="py-2 pr-4 font-medium text-white">{doc.title}</td>
                  <td className="py-2 pr-4">
                    <Badge tone={CATEGORY_TONES[doc.category]}>{CATEGORY_LABELS[doc.category]}</Badge>
                  </td>
                  <td className="py-2 pr-4">
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-amber-400 hover:underline"
                    >
                      Open →
                    </a>
                    {doc.category === "POLICY" &&
                      (doc.acknowledgements.length > 0 ? (
                        <span className="ml-3 text-xs font-semibold text-emerald-400">Acknowledged</span>
                      ) : (
                        <form action={acknowledgePolicy.bind(null, doc.id)} className="ml-3 inline">
                          <button type="submit" className="text-xs font-semibold text-rose-400 hover:underline">
                            I have read this
                          </button>
                        </form>
                      ))}
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
