import { db } from "@/lib/db";
import {
  calculatePF,
  calculateESI,
  calculatePT,
  calculateAnnualTDS,
  grossFromEarnings,
  type EarningsBreakup,
  type OtherAllowanceItem,
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
  attendanceDeduction: number;
  overtimeAmount: number;
  adjustmentsAmount: number;
  netPay: number;
}

export interface AdjustmentInput {
  name: string;
  amount: number;
  type: "EARNING" | "DEDUCTION";
}

function proratedOtherAllowances(items: OtherAllowanceItem[], ratio: number): OtherAllowanceItem[] {
  return items.map((a) => (a.basis === "FIXED" ? a : { ...a, amount: Math.round(a.amount * ratio) }));
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
  adjustments: AdjustmentInput[] = [],
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

  const fullEarnings: EarningsBreakup = {
    basic: Number(structure.basic),
    hra: Number(structure.hra),
    da: Number(structure.da),
    conveyance: Number(structure.conveyance),
    medicalAllowance: Number(structure.medicalAllowance),
    specialAllowance: Number(structure.specialAllowance),
    otherAllowances: (structure.otherAllowances as unknown as OtherAllowanceItem[] | null) ?? [],
  };

  let daysPaid: number;
  let proratedEarnings: EarningsBreakup;
  let attendanceDeduction = 0;
  let wageDetail: { rateType: "HOURLY" | "DAILY"; rate: number; unitsWorked: number } | undefined;
  // For WAGE_BASED employees there's no fixed monthly salary to annualize —
  // this month's actual computed wage stands in for "fullGross" in the TDS
  // extrapolation below, same spirit as MONTHLY employees extrapolating
  // fullGross*12 from their fixed structure.
  let wageBasedFullGrossOverride: number | undefined;

  // Manual daysPaid override (from updateDaysPaid) always forces the
  // straight-line path below, even for HOURLY_ATTENDANCE/WAGE_BASED
  // employees — an explicit HR escape hatch.
  const useAttendanceMode = employee.payMode === "HOURLY_ATTENDANCE" && daysPaidOverride === undefined;
  const useWageMode = employee.payMode === "WAGE_BASED" && daysPaidOverride === undefined;

  if (useWageMode) {
    const monthStart = new Date(year, month - 1, 1);
    const monthEndExclusive = new Date(year, month, 1);
    const presentRows = await db.attendance.findMany({
      where: { employeeId, present: true, date: { gte: monthStart, lt: monthEndExclusive } },
    });
    const daysPresent = presentRows.length;
    const totalHours = presentRows.reduce((sum, row) => sum + Number(row.hoursWorked ?? 0), 0);
    const rate = Number(employee.wageRate ?? 0);
    const rateType = employee.wageRateType ?? "DAILY";
    const unitsWorked = rateType === "HOURLY" ? totalHours : daysPresent;
    const grossWage = Math.round(unitsWorked * rate);

    proratedEarnings = {
      basic: grossWage,
      hra: 0,
      da: 0,
      conveyance: 0,
      medicalAllowance: 0,
      specialAllowance: 0,
      otherAllowances: [],
    };
    daysPaid = daysPresent;
    wageDetail = { rateType, rate, unitsWorked };
    wageBasedFullGrossOverride = grossWage;
  } else if (useAttendanceMode) {
    const monthStart = new Date(year, month - 1, 1);
    const monthEndExclusive = new Date(year, month, 1);
    const daysPresent = await db.attendance.count({
      where: { employeeId, present: true, date: { gte: monthStart, lt: monthEndExclusive } },
    });
    const daysAbsent = Math.max(0, totalDays - daysPresent);
    const freeLeave = employee.freeLeaveDaysPerMonth ?? 0;
    const excessDays = Math.max(0, daysAbsent - freeLeave);
    const dailyRate = Number(employee.excessLeaveDailyDeduction ?? 0);
    attendanceDeduction = Math.round(excessDays * dailyRate);

    const basicPaid = Math.max(0, fullEarnings.basic - attendanceDeduction);
    const attendanceRatio = totalDays > 0 ? daysPresent / totalDays : 0;

    proratedEarnings = {
      basic: basicPaid,
      hra: fullEarnings.hra,
      da: fullEarnings.da,
      conveyance: fullEarnings.conveyance,
      medicalAllowance: fullEarnings.medicalAllowance,
      specialAllowance: fullEarnings.specialAllowance,
      otherAllowances: proratedOtherAllowances(fullEarnings.otherAllowances!, attendanceRatio),
    };
    daysPaid = daysPresent;
  } else {
    daysPaid = daysPaidOverride ?? totalDays;
    const proration = daysPaid / totalDays;
    proratedEarnings = {
      basic: Math.round(fullEarnings.basic * proration),
      hra: Math.round(fullEarnings.hra * proration),
      da: Math.round(fullEarnings.da * proration),
      conveyance: Math.round(fullEarnings.conveyance * proration),
      medicalAllowance: Math.round(fullEarnings.medicalAllowance * proration),
      specialAllowance: Math.round(fullEarnings.specialAllowance * proration),
      otherAllowances: proratedOtherAllowances(fullEarnings.otherAllowances!, proration),
    };
  }

  // Used only to scale the annualized TDS estimate below — daysPaid is
  // daysPresent in attendance mode, the override or full days otherwise.
  const proration = totalDays > 0 ? daysPaid / totalDays : 0;

  const grossEarnings = grossFromEarnings(proratedEarnings);
  const fullGross = wageBasedFullGrossOverride ?? grossFromEarnings(fullEarnings);
  // WAGE_BASED employees have no fixed HRA/Basic to annualize from — use
  // this month's actual (zero HRA, computed wage) figures instead of
  // whatever happens to sit in their SalaryStructure row.
  const hraAnnualBasis = useWageMode ? 0 : fullEarnings.hra;
  const basicAnnualBasis = useWageMode ? fullGross : fullEarnings.basic;

  // Auto overtime, org-toggleable. Deliberately excluded from the PF/ESI
  // wage base and the annual TDS projection below — it's a fluctuating
  // monthly figure, not a stable annualizable one, and PF/ESI wage-base
  // treatment of overtime varies; this is an explicit MVP-level
  // simplification, same spirit as the other approximations in this file.
  let overtimeAmount = 0;
  let overtimeDetail: { hours: number; hourlyRate: number; multiplier: number } | undefined;
  if (org.overtimeAutoCalculateEnabled) {
    const monthStart = new Date(year, month - 1, 1);
    const monthEndExclusive = new Date(year, month, 1);
    const rows = await db.attendance.findMany({
      where: {
        employeeId,
        present: true,
        date: { gte: monthStart, lt: monthEndExclusive },
        hoursWorked: { not: null },
      },
    });
    const standardHours = Number(org.standardHoursPerDay);
    const otHours = rows.reduce((sum, row) => sum + Math.max(0, Number(row.hoursWorked) - standardHours), 0);
    if (otHours > 0) {
      const hourlyRate =
        employee.payMode === "WAGE_BASED"
          ? employee.wageRateType === "HOURLY"
            ? Number(employee.wageRate ?? 0)
            : Number(employee.wageRate ?? 0) / standardHours
          : fullEarnings.basic / (standardHours * totalDays);
      const multiplier = Number(org.overtimeRateMultiplier);
      overtimeAmount = Math.round(otHours * hourlyRate * multiplier);
      overtimeDetail = { hours: otHours, hourlyRate: Math.round(hourlyRate), multiplier };
    }
  }

  const basicPlusDa = proratedEarnings.basic + proratedEarnings.da;
  const pf = calculatePF(basicPlusDa, org.pfApplicable && employee.pfApplicable);
  const esi = calculateESI(grossEarnings, basicPlusDa, org.esiApplicable && employee.esiApplicable);
  const ptAmount = employee.ptApplicable
    ? await calculatePT(employee.state, grossEarnings, new Date(year, month - 1, 1))
    : 0;

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
    hraAnnual: hraAnnualBasis * 12,
    hraRentPaidAnnual: Number(taxDeclaration?.hraRentPaid ?? 0),
    basicAnnual: basicAnnualBasis * 12,
    homeLoanInterest: Number(taxDeclaration?.homeLoanInterest ?? 0),
    otherIncome: Number(taxDeclaration?.otherIncome ?? 0),
  });
  const tdsAmount = Math.round((annualTds / 12) * proration);

  // One-off, run-scoped amounts (see PayrollAdjustment) — deliberately kept
  // out of pfWages/esiWages above, same reasoning as overtimeAmount: a
  // fluctuating one-off, not stable recurring pay.
  const adjustmentsAmount = adjustments.reduce(
    (sum, a) => sum + (a.type === "EARNING" ? a.amount : -a.amount),
    0,
  );

  const netPay =
    grossEarnings + overtimeAmount + adjustmentsAmount - pf.pfEmployee - esi.esiEmployee - ptAmount - tdsAmount;

  return {
    employeeId,
    daysInMonth: totalDays,
    daysPaid,
    earnings: { ...proratedEarnings, wageDetail, overtimeDetail, adjustments } as unknown as Prisma.InputJsonValue,
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
    attendanceDeduction,
    overtimeAmount,
    adjustmentsAmount,
    netPay,
  };
}
