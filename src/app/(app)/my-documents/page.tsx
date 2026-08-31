import { notFound } from "next/navigation";
import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const CATEGORY_LABELS: Record<string, string> = {
  TRAINING: "Training",
  CHECKLIST: "Checklist",
  DOCUMENT: "Document",
};

const CATEGORY_TONES: Record<string, "info" | "warning" | "neutral"> = {
  TRAINING: "info",
  CHECKLIST: "warning",
  DOCUMENT: "neutral",
};

export default async function MyDocumentsPage() {
  const session = await requireSession(["EMPLOYEE"]);
  if (!session.employeeId) notFound();

  const documents = await db.companyDocument.findMany({
    where: { orgId: session.orgId, visibleTo: { some: { id: session.employeeId } } },
    orderBy: { createdAt: "desc" },
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
