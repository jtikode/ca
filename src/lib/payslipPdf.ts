import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/lib/db";
import { PayslipDocument } from "@/components/pdf/PayslipDocument";

export interface PayslipPdfResult {
  buffer: Buffer;
  employeeName: string;
  employeeCode: string;
  employeeEmail: string | null;
  month: number;
  year: number;
}

// Shared by the payslip-download route, the CA export zip, and the
// email-payslip action, so all three render byte-identical PDFs from one
// place instead of duplicating the PayslipDocument construction.
export async function buildPayslipPdfBuffer(
  payrollRunId: string,
  employeeId: string,
  orgId: string,
): Promise<PayslipPdfResult | null> {
  const [org, line] = await Promise.all([
    db.organization.findUniqueOrThrow({ where: { id: orgId } }),
    db.payslipLine.findFirst({
      where: { payrollRunId, employeeId, payrollRun: { orgId } },
      include: { employee: true, payrollRun: true },
    }),
  ]);

  if (!line) return null;

  const earnings = line.earnings as {
    basic: number;
    hra: number;
    da?: number;
    conveyance: number;
    medicalAllowance: number;
    specialAllowance: number;
    otherAllowances?: { name: string; amount: number; basis: "FIXED" | "ATTENDANCE" }[];
    wageDetail?: { rateType: "HOURLY" | "DAILY"; rate: number; unitsWorked: number };
    overtimeDetail?: { hours: number; hourlyRate: number; multiplier: number };
  };

  const buffer = await renderToBuffer(
    PayslipDocument({
      orgName: org.name,
      orgLogoUrl: org.logoUrl,
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
      attendanceDeduction: Number(line.attendanceDeduction),
      overtimeAmount: Number(line.overtimeAmount),
      wageDetail: earnings.wageDetail,
      overtimeDetail: earnings.overtimeDetail,
    }),
  );

  return {
    buffer,
    employeeName: line.employee.name,
    employeeCode: line.employee.employeeCode,
    employeeEmail: line.employee.email,
    month: line.payrollRun.month,
    year: line.payrollRun.year,
  };
}
