import { db } from "@/lib/db";
import { daysInMonth } from "@/lib/dates";
import { calculateGratuity, grossFromEarnings } from "@/lib/statutory";
import { loanBalance } from "@/lib/loans";

export interface SettlementInput {
  employeeId: string;
  lastWorkingDay: Date;
  /** Days of the final month still to be paid. null = day of month of the last working day. */
  daysToPay: number | null;
  noticePayDays: number; // company pays in lieu of notice
  noticeRecoveryDays: number; // employee short of notice, recovered
  leaveEncashDays: number;
  includeGratuity: boolean;
  recoverLoans: boolean;
  otherEarnings: number;
  otherDeductions: number;
}

export interface SettlementLine {
  label: string;
  amount: number;
  type: "EARNING" | "DEDUCTION";
  note?: string;
}

export interface SettlementResult {
  employee: { id: string; name: string; employeeCode: string };
  lastWorkingDay: string; // ISO date
  lines: SettlementLine[];
  totalEarnings: number;
  totalDeductions: number;
  net: number;
  /** Loans that were part of the recovery, to be cancelled when the settlement is recorded. */
  loanIdsRecovered: string[];
}

function nonNegative(v: string | null | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function parseSettlementInput(get: (key: string) => string | null | undefined): SettlementInput | null {
  const employeeId = get("employeeId") ?? "";
  const lwd = new Date(get("lastWorkingDay") ?? "");
  if (!employeeId || Number.isNaN(lwd.getTime())) return null;
  const daysRaw = get("daysToPay");
  return {
    employeeId,
    lastWorkingDay: lwd,
    daysToPay: daysRaw === null || daysRaw === undefined || daysRaw === "" ? null : nonNegative(daysRaw),
    noticePayDays: nonNegative(get("noticePayDays")),
    noticeRecoveryDays: nonNegative(get("noticeRecoveryDays")),
    leaveEncashDays: nonNegative(get("leaveEncashDays")),
    includeGratuity: get("includeGratuity") !== "off",
    recoverLoans: get("recoverLoans") !== "off",
    otherEarnings: nonNegative(get("otherEarnings")),
    otherDeductions: nonNegative(get("otherDeductions")),
  };
}

const r = (n: number) => Math.round(n);

export async function buildSettlement(orgId: string, input: SettlementInput): Promise<SettlementResult | null> {
  const employee = await db.employee.findFirst({
    where: { id: input.employeeId, orgId },
    include: { salaryStructures: { orderBy: { effectiveFrom: "desc" }, take: 1 } },
  });
  const structure = employee?.salaryStructures[0];
  if (!employee || !structure) return null;

  const gross = grossFromEarnings({
    basic: Number(structure.basic),
    hra: Number(structure.hra),
    da: Number(structure.da),
    conveyance: Number(structure.conveyance),
    medicalAllowance: Number(structure.medicalAllowance),
    specialAllowance: Number(structure.specialAllowance),
    otherAllowances:
      (structure.otherAllowances as unknown as { name: string; amount: number; basis: "FIXED" | "ATTENDANCE" }[] | null) ?? [],
  });
  const basicPlusDa = Number(structure.basic) + Number(structure.da);
  const lwd = input.lastWorkingDay;
  const monthDays = daysInMonth(lwd.getMonth() + 1, lwd.getFullYear());

  const lines: SettlementLine[] = [];

  const daysToPay = input.daysToPay ?? lwd.getDate();
  if (daysToPay > 0) {
    lines.push({
      label: "Salary for the final month",
      amount: r((gross / monthDays) * daysToPay),
      type: "EARNING",
      note: `${daysToPay} day${daysToPay === 1 ? "" : "s"} of ${monthDays} at ${r(gross)} a month`,
    });
  }
  if (input.noticePayDays > 0) {
    lines.push({
      label: "Notice pay in lieu",
      amount: r((gross / 30) * input.noticePayDays),
      type: "EARNING",
      note: `${input.noticePayDays} days at gross divided by 30`,
    });
  }
  if (input.leaveEncashDays > 0) {
    lines.push({
      label: "Leave encashment",
      amount: r((basicPlusDa / 30) * input.leaveEncashDays),
      type: "EARNING",
      note: `${input.leaveEncashDays} days at (basic plus DA) divided by 30`,
    });
  }

  const gratuity = calculateGratuity(Number(structure.basic), employee.doj, lwd);
  if (input.includeGratuity && gratuity.daysUntilEligible === null && gratuity.accruedAmount > 0) {
    lines.push({
      label: "Gratuity",
      amount: gratuity.accruedAmount,
      type: "EARNING",
      note: `${gratuity.completedYears} completed years, 15 days of basic per year`,
    });
  }
  if (input.otherEarnings > 0) lines.push({ label: "Other dues", amount: r(input.otherEarnings), type: "EARNING" });

  if (input.noticeRecoveryDays > 0) {
    lines.push({
      label: "Notice period recovery",
      amount: r((gross / 30) * input.noticeRecoveryDays),
      type: "DEDUCTION",
      note: `${input.noticeRecoveryDays} days short of notice`,
    });
  }

  const loanIdsRecovered: string[] = [];
  if (input.recoverLoans) {
    const loans = await db.loan.findMany({ where: { orgId, employeeId: employee.id, status: "ACTIVE" } });
    for (const loan of loans) {
      const { outstanding } = await loanBalance(loan.id, Number(loan.principalAmount));
      if (outstanding > 0) {
        lines.push({ label: `Loan recovery: ${loan.name}`, amount: r(outstanding), type: "DEDUCTION", note: "Outstanding balance" });
        loanIdsRecovered.push(loan.id);
      }
    }
  }
  if (input.otherDeductions > 0) lines.push({ label: "Other deductions", amount: r(input.otherDeductions), type: "DEDUCTION" });

  const totalEarnings = lines.filter((l) => l.type === "EARNING").reduce((a, l) => a + l.amount, 0);
  const totalDeductions = lines.filter((l) => l.type === "DEDUCTION").reduce((a, l) => a + l.amount, 0);

  return {
    employee: { id: employee.id, name: employee.name, employeeCode: employee.employeeCode },
    lastWorkingDay: lwd.toISOString().slice(0, 10),
    lines,
    totalEarnings,
    totalDeductions,
    net: totalEarnings - totalDeductions,
    loanIdsRecovered,
  };
}
