import { db } from "@/lib/db";
import {
  calculatePF,
  calculateESI,
  calculatePT,
  calculateAnnualTDS,
  grossFromEarnings,
  type EarningsBreakup,
} from "@/lib/statutory";
import { daysInMonth, currentFinancialYear } from "@/lib/dates";
import type { Prisma } from "@/generated/prisma/client";

export interface PayslipLineData {
  employeeId: string;
  daysInMonth: number;
  daysPaid: Prisma.Decimal | number;
  earnings: Prisma.InputJsonValue;
  grossEarnings: number;
  pfWages: number;
  pfEmployee: number;
  pfEmployer: number;
  pfEps: number;
  pfEdli: number;
  esiWages: number;
  esiEmployee: number;
  esiEmployer: number;
  ptAmount: number;
  tdsAmount: number;
  netPay: number;
}

/** Computes one employee's payslip line for a given month/year and days paid.
 * Proration, PF wage capping, ESI eligibility, and the TDS annualization are
 * all MVP-level approximations — see prisma/schema.prisma and statutory.ts
 * for the specific simplifications, and hand-verify before trusting a real
 * run (per the plan's verification checklist). */
export async function computePayslipLine(
  orgId: string,
  employeeId: string,
  month: number,
  year: number,
  daysPaidOverride?: number,
): Promise<PayslipLineData | null> {
  const [org, employee] = await Promise.all([
    db.organization.findUniqueOrThrow({ where: { id: orgId } }),
    db.employee.findFirst({
      where: { id: employeeId, orgId },
      include: { salaryStructures: { orderBy: { effectiveFrom: "desc" }, take: 1 } },
    }),
  ]);

  const structure = employee?.salaryStructures[0];
  if (!employee || !structure) return null;

  const totalDays = daysInMonth(month, year);
  const daysPaid = daysPaidOverride ?? totalDays;
  const proration = daysPaid / totalDays;

  const fullEarnings: EarningsBreakup = {
    basic: Number(structure.basic),
    hra: Number(structure.hra),
    conveyance: Number(structure.conveyance),
    medicalAllowance: Number(structure.medicalAllowance),
    specialAllowance: Number(structure.specialAllowance),
  };

  const proratedEarnings: EarningsBreakup = {
    basic: Math.round(fullEarnings.basic * proration),
    hra: Math.round(fullEarnings.hra * proration),
    conveyance: Math.round(fullEarnings.conveyance * proration),
    medicalAllowance: Math.round(fullEarnings.medicalAllowance * proration),
    specialAllowance: Math.round(fullEarnings.specialAllowance * proration),
  };

  const grossEarnings = grossFromEarnings(proratedEarnings);
  const fullGross = grossFromEarnings(fullEarnings);

  const pf = calculatePF(proratedEarnings.basic, org.pfApplicable && employee.pfApplicable);
  const esi = calculateESI(grossEarnings, org.esiApplicable && employee.esiApplicable);
  const ptAmount = await calculatePT(employee.state, grossEarnings, new Date(year, month - 1, 1));

  const financialYear = currentFinancialYear();
  const taxDeclaration = await db.taxDeclaration.findUnique({
    where: { employeeId_financialYear: { employeeId, financialYear } },
  });

  const annualGross = fullGross * 12;
  const annualTds = await calculateAnnualTDS({
    annualGross,
    regime: taxDeclaration?.regime ?? "NEW",
    financialYear,
    section80C: Number(taxDeclaration?.section80C ?? 0),
    section80D: Number(taxDeclaration?.section80D ?? 0),
    hraAnnual: fullEarnings.hra * 12,
    hraRentPaidAnnual: Number(taxDeclaration?.hraRentPaid ?? 0),
    basicAnnual: fullEarnings.basic * 12,
    homeLoanInterest: Number(taxDeclaration?.homeLoanInterest ?? 0),
    otherIncome: Number(taxDeclaration?.otherIncome ?? 0),
  });
  const tdsAmount = Math.round((annualTds / 12) * proration);

  const netPay = grossEarnings - pf.pfEmployee - esi.esiEmployee - ptAmount - tdsAmount;

  return {
    employeeId,
    daysInMonth: totalDays,
    daysPaid,
    earnings: { ...proratedEarnings },
    grossEarnings,
    pfWages: pf.pfWages,
    pfEmployee: pf.pfEmployee,
    pfEmployer: pf.pfEmployer,
    pfEps: pf.pfEps,
    pfEdli: pf.pfEdli,
    esiWages: esi.esiWages,
    esiEmployee: esi.esiEmployee,
    esiEmployer: esi.esiEmployer,
    ptAmount,
    tdsAmount,
    netPay,
  };
}
