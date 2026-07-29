import { ZipArchive } from "archiver";
import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/lib/db";
import { generateECRText } from "@/lib/exports/ecr";
import { buildCAExportWorkbook } from "@/lib/exports/registerWorkbook";
import { PayslipDocument } from "@/components/pdf/PayslipDocument";
import { MONTH_NAMES } from "@/lib/dates";

function zipFromEntries(entries: { name: string; content: Buffer | string }[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = new ZipArchive({ zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);

    for (const entry of entries) {
      archive.append(entry.content, { name: entry.name });
    }

    archive.finalize();
  });
}

export async function buildCAExportZip(payrollRunId: string, orgId: string): Promise<Buffer> {
  const [run, org] = await Promise.all([
    db.payrollRun.findFirstOrThrow({
      where: { id: payrollRunId, orgId },
      include: { payslipLines: { include: { employee: true }, orderBy: { employee: { name: "asc" } } } },
    }),
    db.organization.findUniqueOrThrow({ where: { id: orgId } }),
  ]);

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
    const earnings = line.earnings as {
      basic: number;
      hra: number;
      conveyance: number;
      medicalAllowance: number;
      specialAllowance: number;
    };

    const pdf = await renderToBuffer(
      PayslipDocument({
        orgName: org.name,
        employeeName: line.employee.name,
        employeeCode: line.employee.employeeCode,
        month: run.month,
        year: run.year,
        earnings,
        grossEarnings: Number(line.grossEarnings),
        pfEmployee: Number(line.pfEmployee),
        esiEmployee: Number(line.esiEmployee),
        ptAmount: Number(line.ptAmount),
        tdsAmount: Number(line.tdsAmount),
        netPay: Number(line.netPay),
        daysPaid: Number(line.daysPaid),
        daysInMonth: line.daysInMonth,
      }),
    );

    entries.push({ name: `Payslips/${line.employee.employeeCode}-${line.employee.name}.pdf`, content: pdf });
  }

  return zipFromEntries(entries);
}
