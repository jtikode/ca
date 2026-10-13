import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { buildTallyPayrollXml } from "@/lib/exports/tallyXml";
import { MONTH_NAMES } from "@/lib/dates";

export async function GET(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const session = await requireSession(["SUPERADMIN", "HR_MANAGER"]);

  const run = await db.payrollRun.findFirst({
    where: { id: runId, orgId: session.orgId },
    include: { payslipLines: true },
  });
  if (!run) notFound();
  if (run.status !== "FINALIZED") {
    return NextResponse.json({ error: "Finalize the run before exporting to Tally." }, { status: 400 });
  }

  const lines = run.payslipLines;
  const sum = (pick: (l: (typeof lines)[number]) => number) => lines.reduce((acc, l) => acc + pick(l), 0);

  const xml = buildTallyPayrollXml(
    {
      netPay: sum((l) => Number(l.netPay)),
      pfEmployee: sum((l) => Number(l.pfEmployee)),
      pfEmployerTotal: sum((l) => Number(l.pfEmployer) + Number(l.pfEps) + Number(l.pfEdli)),
      esiEmployee: sum((l) => Number(l.esiEmployee)),
      esiEmployer: sum((l) => Number(l.esiEmployer)),
      pt: sum((l) => Number(l.ptAmount)),
      tds: sum((l) => Number(l.tdsAmount)),
    },
    run.month,
    run.year,
  );

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="tally-payroll-${MONTH_NAMES[run.month - 1]}-${run.year}.xml"`,
    },
  });
}
