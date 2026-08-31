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
        <Link href={`/payroll/${id}`} className="text-sm font-semibold text-amber-400 hover:underline">
          ← Back to {MONTH_NAMES[run.month - 1]} {run.year}
        </Link>
      </div>

      <Card>
        <h1 className="mb-2 text-xl font-bold text-white">Export for your CA</h1>
        <p className="mb-4 text-sm text-slate-400">
          Downloads a ZIP with the payroll register, PF ECR file, ESI/PT/TDS working sheets, and every employee&apos;s
          payslip — ready for your accountant to review and file. These are computed estimates, not filed returns:
          have your CA verify the figures before submitting anything to EPFO, ESIC, or the income tax department.
        </p>
        <a
          href={`/api/payroll/${id}/export`}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-amber-500 px-4 text-sm font-semibold text-slate-950 shadow-[0_0_20px_-6px_rgba(245,158,11,0.5)] transition hover:bg-amber-400"
        >
          Download CA export ZIP
        </a>
      </Card>

      {previousBatches.length > 0 && (
        <Card>
          <h2 className="mb-2 text-lg font-bold text-white">Previously generated</h2>
          <ul className="space-y-1 text-sm text-slate-400">
            {previousBatches.map((batch) => (
              <li key={batch.id}>{batch.generatedAt.toLocaleString("en-IN")}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
