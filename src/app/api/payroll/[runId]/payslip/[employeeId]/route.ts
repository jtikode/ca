import { notFound } from "next/navigation";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { PayslipDocument } from "@/components/pdf/PayslipDocument";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string; employeeId: string }> },
) {
  const { runId, employeeId } = await params;
  const session = await requireSession();

  const [org, line] = await Promise.all([
    db.organization.findUniqueOrThrow({ where: { id: session.orgId } }),
    db.payslipLine.findFirst({
      where: { payrollRunId: runId, employeeId, payrollRun: { orgId: session.orgId } },
      include: { employee: true, payrollRun: true },
    }),
  ]);

  if (!line) notFound();

  const earnings = line.earnings as {
    basic: number;
    hra: number;
    conveyance: number;
    medicalAllowance: number;
    specialAllowance: number;
  };

  const buffer = await renderToBuffer(
    PayslipDocument({
      orgName: org.name,
      employeeName: line.employee.name,
      employeeCode: line.employee.employeeCode,
      month: line.payrollRun.month,
      year: line.payrollRun.year,
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

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="payslip-${line.employee.employeeCode}-${line.payrollRun.month}-${line.payrollRun.year}.pdf"`,
    },
  });
}
