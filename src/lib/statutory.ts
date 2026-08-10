import { db } from "@/lib/db";
import type { TaxRegime } from "@/generated/prisma/client";

// PF and ESI rates change rarely, and only via government notification (not
// per-org customization), so they're kept as code constants rather than a
// DB table — see the plan's rationale in prisma/schema.prisma.
export const PF_WAGE_CEILING = 15000;
export const PF_EMPLOYEE_RATE = 0.12;
export const PF_EPS_RATE = 0.0833;
export const PF_EPS_MAX_MONTHLY = 1250; // 8.33% of the 15,000 ceiling, rounded
export const PF_EMPLOYER_TOTAL_RATE = 0.12;
export const PF_EDLI_RATE = 0.005;

export const ESI_WAGE_CEILING = 21000;
export const ESI_EMPLOYEE_RATE = 0.0075;
export const ESI_EMPLOYER_RATE = 0.0325;

// Health & Education cess, applied on tax after rebate, both regimes.
export const CESS_RATE = 0.04;

// Rebate u/s 87A — these thresholds move with each Union Budget. Verify
// against the Finance Act in force for the financial year being processed
// before trusting a real payroll run.
export const REBATE_87A: Record<TaxRegime, { incomeLimit: number; maxRebate: number }> = {
  NEW: { incomeLimit: 1_200_000, maxRebate: 60_000 },
  OLD: { incomeLimit: 500_000, maxRebate: 12_500 },
};

export const STANDARD_DEDUCTION: Record<TaxRegime, number> = {
  NEW: 75_000,
  OLD: 50_000,
};

function round(n: number): number {
  return Math.round(n);
}

export interface OtherAllowanceItem {
  name: string;
  amount: number;
  /** FIXED is paid in full regardless of attendance; ATTENDANCE prorates the
   * same way basic/hra/etc. do. */
  basis: "FIXED" | "ATTENDANCE";
}

export interface EarningsBreakup {
  basic: number;
  hra: number;
  /** Dearness Allowance — included in the PF/ESI wage-basis formulas below
   * alongside basic, but excluded from the HOURLY_ATTENDANCE free-leave
   * deduction rule (that applies to basic only). */
  da: number;
  conveyance: number;
  medicalAllowance: number;
  specialAllowance: number;
  otherAllowances?: OtherAllowanceItem[];
}

export function grossFromEarnings(e: EarningsBreakup): number {
  const otherTotal = (e.otherAllowances ?? []).reduce((sum, a) => sum + a.amount, 0);
  return e.basic + e.hra + e.da + e.conveyance + e.medicalAllowance + e.specialAllowance + otherTotal;
}

export interface PFResult {
  pfWages: number;
  pfEmployee: number;
  pfEmployer: number;
  pfEps: number;
  pfEdli: number;
}

/** PF wage basis is Basic + DA. Defaults to capping PF wages at the
 * statutory ceiling, which is what most small employers do unless they opt
 * into voluntary higher contribution. */
export function calculatePF(basicPlusDa: number, applicable: boolean): PFResult {
  if (!applicable) {
    return { pfWages: 0, pfEmployee: 0, pfEmployer: 0, pfEps: 0, pfEdli: 0 };
  }

  const pfWages = Math.min(basicPlusDa, PF_WAGE_CEILING);
  const pfEmployee = round(pfWages * PF_EMPLOYEE_RATE);
  const pfEps = Math.min(round(pfWages * PF_EPS_RATE), PF_EPS_MAX_MONTHLY);
  const employerTotal = round(pfWages * PF_EMPLOYER_TOTAL_RATE);
  const pfEmployer = employerTotal - pfEps;
  const pfEdli = round(pfWages * PF_EDLI_RATE);

  return { pfWages, pfEmployee, pfEmployer, pfEps, pfEdli };
}

export interface ESIResult {
  esiWages: number;
  esiEmployee: number;
  esiEmployer: number;
}

/** Eligibility (whether ESI applies at all) is still decided by gross wages
 * against the ceiling. The contribution wage — what the 0.75%/3.25% rates
 * are actually applied to — is max(basic+DA, 50% of gross), per the
 * client's stated wage-basis rule. This is always ≤ grossEarnings (basic+DA
 * can't exceed gross by construction, and 50% of gross ≤ gross), so it never
 * needs a separate cap once eligibility already confirmed gross ≤ ceiling. */
export function calculateESI(grossEarnings: number, basicPlusDa: number, applicable: boolean): ESIResult {
  if (!applicable || grossEarnings > ESI_WAGE_CEILING) {
    return { esiWages: 0, esiEmployee: 0, esiEmployer: 0 };
  }

  const esiWages = Math.max(basicPlusDa, grossEarnings * 0.5);

  return {
    esiWages,
    esiEmployee: round(esiWages * ESI_EMPLOYEE_RATE),
    esiEmployer: round(esiWages * ESI_EMPLOYER_RATE),
  };
}

export async function calculatePT(state: string, grossEarnings: number, asOf: Date): Promise<number> {
  const slab = await db.pTSlab.findFirst({
    where: {
      state,
      effectiveFrom: { lte: asOf },
      minGross: { lte: grossEarnings },
      OR: [{ maxGross: null }, { maxGross: { gte: grossEarnings } }],
    },
    orderBy: { effectiveFrom: "desc" },
  });

  return slab ? Number(slab.monthlyAmount) : 0;
}

// Payment of Gratuity Act, 1972 — central law, applies uniformly regardless
// of state.
export const GRATUITY_ELIGIBILITY_YEARS = 5;
export const GRATUITY_DAYS_PER_YEAR = 15;
export const GRATUITY_WAGE_DIVISOR = 26;

export interface GratuityResult {
  completedYears: number;
  accruedAmount: number;
  eligibleAt: Date;
  /** null once already past the 5-year eligibility mark. */
  daysUntilEligible: number | null;
}

/** Eligible after 5 years of continuous service (death/disablement
 * exceptions not modeled here). Formula: (Basic × 15 × completed years) / 26
 * — the Act technically uses Basic+DA, but gratuity accrual here is Basic
 * only (a known simplification, unlike PF/ESI which do include DA — see
 * calculatePF/calculateESI). A final partial year rounds up to a full year
 * once it exceeds 6 months, per the Act. */
export function calculateGratuity(basic: number, doj: Date, asOf: Date = new Date()): GratuityResult {
  const msPerDay = 24 * 60 * 60 * 1000;
  const totalDays = Math.max(0, Math.floor((asOf.getTime() - doj.getTime()) / msPerDay));
  const totalYearsExact = totalDays / 365.25;

  const wholeYears = Math.floor(totalYearsExact);
  const remainderYears = totalYearsExact - wholeYears;
  const completedYears = remainderYears > 0.5 ? wholeYears + 1 : wholeYears;

  const accruedAmount = round((basic * GRATUITY_DAYS_PER_YEAR * completedYears) / GRATUITY_WAGE_DIVISOR);

  const eligibleAt = new Date(doj);
  eligibleAt.setFullYear(eligibleAt.getFullYear() + GRATUITY_ELIGIBILITY_YEARS);

  const daysUntilEligible =
    asOf >= eligibleAt ? null : Math.ceil((eligibleAt.getTime() - asOf.getTime()) / msPerDay);

  return { completedYears, accruedAmount, eligibleAt, daysUntilEligible };
}

export interface TDSInput {
  annualGross: number;
  regime: TaxRegime;
  financialYear: string;
  section80C: number;
  section80D: number;
  hraAnnual: number;
  hraRentPaidAnnual: number;
  basicAnnual: number;
  homeLoanInterest: number;
  otherIncome: number;
}

export interface TaxComputationResult {
  standardDeduction: number;
  hraExemption: number;
  section80CApplied: number;
  section80DApplied: number;
  homeLoanInterestApplied: number;
  grossTotalIncome: number;
  taxableIncome: number;
  taxBeforeRebate: number;
  rebateApplied: number;
  taxAfterRebate: number;
  cess: number;
  totalTax: number;
}

/** Shared slab-wise tax computation, used both by the per-run TDS estimator
 * (calculateAnnualTDS, annualized from the current month's figures) and by
 * Form 16 Part B (actual full-year figures) — the deduction/exemption SHAPE
 * must stay identical between the two call sites; only the input figures
 * differ. HRA exemption assumes a metro rate (50% of basic) as a
 * simplification. */
export async function computeTaxableIncomeAndTax(input: TDSInput): Promise<TaxComputationResult> {
  const standardDeduction = STANDARD_DEDUCTION[input.regime];
  const grossTotalIncome = round(input.annualGross + input.otherIncome - standardDeduction);

  let hraExemption = 0;
  let section80CApplied = 0;
  let section80DApplied = 0;
  let homeLoanInterestApplied = 0;
  let taxableIncome = grossTotalIncome;

  if (input.regime === "OLD") {
    hraExemption = Math.max(
      0,
      Math.min(
        input.hraAnnual,
        input.hraRentPaidAnnual - 0.1 * input.basicAnnual,
        0.5 * input.basicAnnual,
      ),
    );
    section80CApplied = Math.min(input.section80C, 150_000);
    section80DApplied = input.section80D;
    homeLoanInterestApplied = Math.min(input.homeLoanInterest, 200_000);

    taxableIncome -= hraExemption + section80CApplied + section80DApplied + homeLoanInterestApplied;
  }

  taxableIncome = Math.max(0, round(taxableIncome));

  const slabs = await db.incomeTaxSlab.findMany({
    where: { regime: input.regime, financialYear: input.financialYear },
    orderBy: { minIncome: "asc" },
  });

  let taxBeforeRebate = 0;
  for (const slab of slabs) {
    const min = Number(slab.minIncome);
    const max = slab.maxIncome ? Number(slab.maxIncome) : Infinity;
    if (taxableIncome <= min) continue;
    const slabAmount = Math.min(taxableIncome, max) - min;
    taxBeforeRebate += slabAmount * Number(slab.rate);
  }

  const rebate = REBATE_87A[input.regime];
  let rebateApplied = 0;
  let taxAfterRebate = taxBeforeRebate;
  if (taxableIncome <= rebate.incomeLimit) {
    rebateApplied = Math.min(rebate.maxRebate, taxBeforeRebate);
    taxAfterRebate = Math.max(0, taxBeforeRebate - rebateApplied);
  }

  const cess = round(taxAfterRebate * CESS_RATE);
  const totalTax = round(taxAfterRebate + cess);

  return {
    standardDeduction,
    hraExemption: round(hraExemption),
    section80CApplied: round(section80CApplied),
    section80DApplied: round(section80DApplied),
    homeLoanInterestApplied: round(homeLoanInterestApplied),
    grossTotalIncome,
    taxableIncome,
    taxBeforeRebate: round(taxBeforeRebate),
    rebateApplied: round(rebateApplied),
    taxAfterRebate: round(taxAfterRebate),
    cess,
    totalTax,
  };
}

/** Annualized estimate for the CA to review — not a Form 24Q filing figure. */
export async function calculateAnnualTDS(input: TDSInput): Promise<number> {
  const result = await computeTaxableIncomeAndTax(input);
  return result.totalTax;
}
