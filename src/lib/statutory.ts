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

export interface EarningsBreakup {
  basic: number;
  hra: number;
  conveyance: number;
  medicalAllowance: number;
  specialAllowance: number;
  otherAllowances?: { name: string; amount: number }[];
}

export function grossFromEarnings(e: EarningsBreakup): number {
  const otherTotal = (e.otherAllowances ?? []).reduce((sum, a) => sum + a.amount, 0);
  return e.basic + e.hra + e.conveyance + e.medicalAllowance + e.specialAllowance + otherTotal;
}

export interface PFResult {
  pfWages: number;
  pfEmployee: number;
  pfEmployer: number;
  pfEps: number;
  pfEdli: number;
}

/** Defaults to capping PF wages at the statutory ceiling, which is what most
 * small employers do unless they opt into voluntary higher contribution. */
export function calculatePF(basic: number, applicable: boolean): PFResult {
  if (!applicable) {
    return { pfWages: 0, pfEmployee: 0, pfEmployer: 0, pfEps: 0, pfEdli: 0 };
  }

  const pfWages = Math.min(basic, PF_WAGE_CEILING);
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

export function calculateESI(grossEarnings: number, applicable: boolean): ESIResult {
  if (!applicable || grossEarnings > ESI_WAGE_CEILING) {
    return { esiWages: 0, esiEmployee: 0, esiEmployer: 0 };
  }

  return {
    esiWages: grossEarnings,
    esiEmployee: round(grossEarnings * ESI_EMPLOYEE_RATE),
    esiEmployer: round(grossEarnings * ESI_EMPLOYER_RATE),
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

/** Annualized estimate for the CA to review — not a Form 24Q filing figure.
 * HRA exemption assumes a metro rate (50% of basic) as a simplification. */
export async function calculateAnnualTDS(input: TDSInput): Promise<number> {
  const stdDeduction = STANDARD_DEDUCTION[input.regime];

  let taxableIncome = input.annualGross + input.otherIncome - stdDeduction;

  if (input.regime === "OLD") {
    const hraExemption = Math.max(
      0,
      Math.min(
        input.hraAnnual,
        input.hraRentPaidAnnual - 0.1 * input.basicAnnual,
        0.5 * input.basicAnnual,
      ),
    );
    const cappedSection80C = Math.min(input.section80C, 150_000);
    const cappedHomeLoanInterest = Math.min(input.homeLoanInterest, 200_000);

    taxableIncome -=
      hraExemption + cappedSection80C + input.section80D + cappedHomeLoanInterest;
  }

  taxableIncome = Math.max(0, round(taxableIncome));

  const slabs = await db.incomeTaxSlab.findMany({
    where: { regime: input.regime, financialYear: input.financialYear },
    orderBy: { minIncome: "asc" },
  });

  let tax = 0;
  for (const slab of slabs) {
    const min = Number(slab.minIncome);
    const max = slab.maxIncome ? Number(slab.maxIncome) : Infinity;
    if (taxableIncome <= min) continue;
    const slabAmount = Math.min(taxableIncome, max) - min;
    tax += slabAmount * Number(slab.rate);
  }

  const rebate = REBATE_87A[input.regime];
  if (taxableIncome <= rebate.incomeLimit) {
    tax = Math.max(0, tax - rebate.maxRebate);
  }

  const totalTax = tax * (1 + CESS_RATE);
  return round(totalTax);
}
