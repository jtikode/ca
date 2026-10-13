import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { buildBankFileCsv, splitBankLines } from "@/lib/exports/bankFile";
import { MONTH_NAMES } from "@/lib/dates";

export async function GET(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const session = await requireSession(["SUPERADMIN", "HR_MANAGER"]);

  const run = await db.payrollRun.findFirst({
    where: { id: runId, orgId: session.orgId },
    include: { payslipLines: { include: { employee: true }, orderBy: { employee: { name: "asc" } } } },
  });
  if (!run) notFound();
  if (run.status !== "FINALIZED") {
    return NextResponse.json({ error: "Finalize the run before downloading the bank file." }, { status: 400 });
  }

  const { payable } = splitBankLines(
    run.payslipLines.map((l) => ({
      employeeCode: l.employee.employeeCode,
      name: l.employee.name,
      bankAccountNo: l.employee.bankAccountNo,
      bankIfsc: l.employee.bankIfsc,
      netPay: Number(l.netPay),
    })),
  );
  if (payable.length === 0) {
    return NextResponse.json({ error: "No employee has complete bank details and a net pay above zero." }, { status: 400 });
  }

  const csv = buildBankFileCsv(payable, run.month, run.year);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bank-transfer-${MONTH_NAMES[run.month - 1]}-${run.year}.csv"`,
    },
  });
}
