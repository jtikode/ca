import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/lib/db";
import {
  monthsInFinancialYear,
  financialYearAndQuarterFor,
  quarterLabel,
  financialYearRangeLabel,
  type MonthYear,
  type Quarter,
} from "@/lib/dates";
import { aggregateEmployeePayslipLines, aggregateOrgPayslipLines } from "@/lib/exports/periodAggregation";
import { zipFromEntries } from "@/lib/exports/zip";
import { computeTaxableIncomeAndTax, type TaxComputationResult } from "@/lib/statutory";
import { Form16PartBDocument } from "@/components/pdf/Form16PartBDocument";
import type { TaxRegime } from "@/generated/prisma/client";

function assessmentYearFor(financialYear: string): string {
  const startYear = Number(financialYear.slice(0, 4));
  return `${startYear + 1}-${String((startYear + 2) % 100).padStart(2, "0")}`;
}

export interface QuarterlyBreakupRow {
  quarter: Quarter;
  label: string;
  grossSalary: number;
  tdsDeducted: number;
  monthsIncluded: number;
}

export interface Form16PartBData {
  orgName: string;
  orgAddress: string;
  orgPan: string;
  orgTan: string;
  employeeName: string;
  employeeCode: string;
  employeePan: string;
  designation: string;
  financialYear: string;
  assessmentYear: string;
  periodLabel: string;
  regime: TaxRegime;
  hasTaxDeclaration: boolean;
  hasFinalizedData: boolean;
  computation: TaxComputationResult;
  grossSalaryActual: number;
  otherIncomeDeclared: number;
  totalTdsDeductedActual: number;
  quarterlyBreakup: QuarterlyBreakupRow[];
  monthsMissing: MonthYear[];
  generatedOn: Date;
}

export type Form16PartBResult =
  | { ok: true; data: Form16PartBData }
  | { ok: false; error: string };

/** Blocked if the org hasn't filled in PAN/TAN yet — a Form 16 without a
 * real TAN isn't a document worth handing anyone (user-confirmed scope
 * decision), so we stop early with a clear message rather than printing a
 * placeholder. */
export async function buildForm16PartBData(
  orgId: string,
  employeeId: string,
  financialYear: string,
): Promise<Form16PartBResult> {
  const [org, employee] = await Promise.all([
    db.organization.findUniqueOrThrow({ where: { id: orgId } }),
    db.employee.findFirst({ where: { id: employeeId, orgId } }),
  ]);

  if (!employee) return { ok: false, error: "Employee not found." };
  if (!org.pan || !org.tan) {
    return {
      ok: false,
      error: "Add your company's PAN and TAN in Settings before generating Form 16 Part B.",
    };
  }

  const periods = monthsInFinancialYear(financialYear);
  const totals = await aggregateEmployeePayslipLines(orgId, employeeId, periods);
  if (!totals) return { ok: false, error: "Employee not found." };

  const hasFinalizedData = totals.lines.length > 0;

  const taxDeclaration = await db.taxDeclaration.findUnique({
    where: { employeeId_financialYear: { employeeId, financialYear } },
  });
  const hasTaxDeclaration = Boolean(taxDeclaration);
  const regime: TaxRegime = taxDeclaration?.regime ?? "NEW";

  const computation = await computeTaxableIncomeAndTax({
    annualGross: totals.grossEarnings,
    regime,
    financialYear,
    section80C: Number(taxDeclaration?.section80C ?? 0),
    section80D: Number(taxDeclaration?.section80D ?? 0),
    hraAnnual: totals.hraTotal,
    hraRentPaidAnnual: Number(taxDeclaration?.hraRentPaid ?? 0),
    basicAnnual: totals.basicTotal,
    homeLoanInterest: Number(taxDeclaration?.homeLoanInterest ?? 0),
    otherIncome: Number(taxDeclaration?.otherIncome ?? 0),
  });

  const quarterlyMap = new Map<Quarter, { grossSalary: number; tdsDeducted: number; monthsIncluded: number }>();
  for (let q = 1; q <= 4; q++) {
    quarterlyMap.set(q as Quarter, { grossSalary: 0, tdsDeducted: 0, monthsIncluded: 0 });
  }
  for (const line of totals.lines) {
    const { quarter } = financialYearAndQuarterFor(line.payrollRun.month, line.payrollRun.year);
    const bucket = quarterlyMap.get(quarter)!;
    bucket.grossSalary += Number(line.grossEarnings);
    bucket.tdsDeducted += Number(line.tdsAmount);
    bucket.monthsIncluded += 1;
  }
  const quarterlyBreakup: QuarterlyBreakupRow[] = ([1, 2, 3, 4] as Quarter[]).map((quarter) => {
    const bucket = quarterlyMap.get(quarter)!;
    return { quarter, label: quarterLabel(financialYear, quarter), ...bucket };
  });

  const foundKeys = new Set(totals.lines.map((l) => `${l.payrollRun.year}-${l.payrollRun.month}`));
  const monthsMissing = periods.filter((p) => !foundKeys.has(`${p.year}-${p.month}`));

  return {
    ok: true,
    data: {
      orgName: org.legalName ?? org.name,
      orgAddress: org.address ?? "[Company address — add in Settings]",
      orgPan: org.pan,
      orgTan: org.tan,
      employeeName: employee.name,
      employeeCode: employee.employeeCode,
      employeePan: employee.pan ?? "[PAN not on file]",
      designation: employee.designation ?? employee.employeeCode,
      financialYear,
      assessmentYear: assessmentYearFor(financialYear),
      periodLabel: financialYearRangeLabel(financialYear),
      regime,
      hasTaxDeclaration,
      hasFinalizedData,
      computation,
      grossSalaryActual: totals.grossEarnings,
      otherIncomeDeclared: Number(taxDeclaration?.otherIncome ?? 0),
      totalTdsDeductedActual: totals.tdsAmount,
      quarterlyBreakup,
      monthsMissing,
      generatedOn: new Date(),
    },
  };
}

export interface Form16PdfResult {
  buffer: Buffer;
  employeeName: string;
  employeeCode: string;
  employeeEmail: string | null;
}

export async function buildForm16PartBBuffer(
  orgId: string,
  employeeId: string,
  financialYear: string,
): Promise<{ ok: true; result: Form16PdfResult } | { ok: false; error: string }> {
  const result = await buildForm16PartBData(orgId, employeeId, financialYear);
  if (!result.ok) return result;

  const [buffer, employee] = await Promise.all([
    renderToBuffer(Form16PartBDocument(result.data)),
    db.employee.findFirst({ where: { id: employeeId, orgId }, select: { email: true } }),
  ]);

  return {
    ok: true,
    result: {
      buffer,
      employeeName: result.data.employeeName,
      employeeCode: result.data.employeeCode,
      employeeEmail: employee?.email ?? null,
    },
  };
}

/** ZIPs one Form 16 Part B PDF per employee who had any actual pay in the
 * FY (not filtered to nonzero TDS — a Form 16 Part B showing zero TDS is
 * still a valid document for low earners). Skips (rather than aborts on)
 * individual employees whose PDF build fails, e.g. missing employee PAN
 * doesn't block the batch since employeePan already falls back to a
 * placeholder — this only guards against unexpected errors. */
export async function buildAllForm16PartBZip(
  orgId: string,
  financialYear: string,
): Promise<{ ok: true; buffer: Buffer } | { ok: false; error: string }> {
  const org = await db.organization.findUniqueOrThrow({ where: { id: orgId } });
  if (!org.pan || !org.tan) {
    return {
      ok: false,
      error: "Add your company's PAN and TAN in Settings before generating Form 16 Part B.",
    };
  }

  const periods = monthsInFinancialYear(financialYear);
  const { employeeTotals } = await aggregateOrgPayslipLines(orgId, periods);

  const entries: { name: string; content: Buffer }[] = [];
  for (const totals of employeeTotals.values()) {
    if (totals.grossEarnings <= 0) continue;
    const result = await buildForm16PartBBuffer(orgId, totals.employeeId, financialYear);
    if (!result.ok) continue;
    entries.push({
      name: `Form16-PartB/${result.result.employeeCode}-${result.result.employeeName}.pdf`,
      content: result.result.buffer,
    });
  }

  return { ok: true, buffer: await zipFromEntries(entries) };
}
