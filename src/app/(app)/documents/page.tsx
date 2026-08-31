import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AddDocumentForm } from "@/components/documents/AddDocumentForm";
import { deleteDocument } from "@/actions/documentActions";

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

export default async function DocumentsPage() {
  const session = await requireSession(["SUPERADMIN", "HR_MANAGER"]);

  const [employees, documents] = await Promise.all([
    db.employee.findMany({
      where: { orgId: session.orgId, status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, employeeCode: true },
    }),
    db.companyDocument.findMany({
      where: { orgId: session.orgId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { visibleTo: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Documents</h1>

      <Card>
        <h2 className="mb-1 text-lg font-bold text-white">Add training material, checklist, or document</h2>
        <p className="mb-4 text-sm text-slate-400">
          Paste a link (e.g. Google Drive — share it with &quot;Anyone with the link&quot; as Viewer first) and
          choose which employees can see it.
        </p>
        <AddDocumentForm employees={employees} />
      </Card>

      <Card className="overflow-x-auto">
        <h2 className="mb-4 text-lg font-bold text-white">All documents</h2>
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="py-2 pr-4">Title</th>
              <th className="py-2 pr-4">Category</th>
              <th className="py-2 pr-4">Visible to</th>
              <th className="py-2 pr-4"></th>
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
                <td className="py-2 pr-4 text-slate-400">
                  {doc._count.visibleTo} employee{doc._count.visibleTo === 1 ? "" : "s"}
                </td>
                <td className="py-2 pr-4">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-amber-400 hover:underline"
                  >
                    Open
                  </a>
                </td>
                <td className="py-2 pr-4">
                  <form action={deleteDocument.bind(null, doc.id)}>
                    <button type="submit" className="text-sm font-semibold text-red-400 hover:underline">
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {documents.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-slate-400">
                  No documents yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
