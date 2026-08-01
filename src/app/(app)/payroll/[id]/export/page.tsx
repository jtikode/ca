import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { MONTH_NAMES } from "@/lib/dates";

export default async function ExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession(["SUPERADMIN", "HR_MANAGER"]);

  const run = await db.payrollRun.findFirst({ where: { id, orgId: session.orgId } });
  if (!run) notFound();
  if (run.status !== "FINALIZED") notFound();

  const previousBatches = await db.cAExportBatch.findMany({
    where: { payrollRunId: id },
    orderBy: { generatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/payroll/${id}`} className="text-sm font-semibold text-blue-700 hover:underline">
          ← Back to {MONTH_NAMES[run.month - 1]} {run.year}
        </Link>
      </div>

      <Card>
        <h1 className="mb-2 text-xl font-bold text-slate-900">Export for your CA</h1>
        <p className="mb-4 text-sm text-slate-600">
          Downloads a ZIP with the payroll register, PF ECR file, ESI/PT/TDS working sheets, and every employee&apos;s
          payslip — ready for your accountant to review and file. These are computed estimates, not filed returns:
          have your CA verify the figures before submitting anything to EPFO, ESIC, or the income tax department.
        </p>
        <a
          href={`/api/payroll/${id}/export`}
          className="inline-block rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
        >
          Download CA export ZIP
        </a>
      </Card>

      {previousBatches.length > 0 && (
        <Card>
          <h2 className="mb-2 text-lg font-bold text-slate-900">Previously generated</h2>
          <ul className="space-y-1 text-sm text-slate-600">
            {previousBatches.map((batch) => (
              <li key={batch.id}>{batch.generatedAt.toLocaleString("en-IN")}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
