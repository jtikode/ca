import { NextResponse } from "next/server";
import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { buildCAExportZip } from "@/lib/exports/caExportZip";
import { MONTH_NAMES } from "@/lib/dates";

export async function GET(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const session = await requireSession();

  const run = await db.payrollRun.findFirst({ where: { id: runId, orgId: session.orgId } });
  if (!run) return NextResponse.json({ error: "Payroll run not found." }, { status: 404 });
  if (run.status !== "FINALIZED") {
    return NextResponse.json({ error: "Finalize the run before exporting." }, { status: 400 });
  }

  const zip = await buildCAExportZip(runId, session.orgId);

  await db.cAExportBatch.create({
    data: { orgId: session.orgId, payrollRunId: runId, generatedById: session.userId },
  });

  const period = `${MONTH_NAMES[run.month - 1]}-${run.year}`;

  return new Response(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="CA-Export-${period}.zip"`,
    },
  });
}
