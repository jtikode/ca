import { db } from "@/lib/db";
import { generateECRText } from "@/lib/exports/ecr";
import { buildCAExportWorkbook } from "@/lib/exports/registerWorkbook";
import { buildPayslipPdfBuffer } from "@/lib/payslipPdf";
import { zipFromEntries } from "@/lib/exports/zip";
import { MONTH_NAMES } from "@/lib/dates";

export async function buildCAExportZip(payrollRunId: string, orgId: string): Promise<Buffer> {
  const run = await db.payrollRun.findFirstOrThrow({
    where: { id: payrollRunId, orgId },
    include: { payslipLines: { include: { employee: true }, orderBy: { employee: { name: "asc" } } } },
  });

  const period = `${MONTH_NAMES[run.month - 1]}-${run.year}`;
  const entries: { name: string; content: Buffer | string }[] = [];

  entries.push({
    name: `PF-ECR-${period}.txt`,
    content: generateECRText(run.payslipLines),
  });

  entries.push({
    name: `Payroll-Register-${period}.xlsx`,
    content: buildCAExportWorkbook(run.payslipLines),
  });

  for (const line of run.payslipLines) {
    const result = await buildPayslipPdfBuffer(payrollRunId, line.employeeId, orgId);
    if (!result) continue;

    entries.push({ name: `Payslips/${line.employee.employeeCode}-${line.employee.name}.pdf`, content: result.buffer });
  }

  return zipFromEntries(entries);
}
