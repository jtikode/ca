"use server";

import { ctcCalculatorSchema } from "@/lib/validators";
import { grossFromEarnings, calculatePF, calculateESI, calculatePT, type EarningsBreakup } from "@/lib/statutory";

// The one action in this codebase deliberately WITHOUT assertSession — the
// public CTC calculator at /calculator. Safe without a session because it
// only reads PTSlab/IncomeTaxSlab (global tables, no orgId column — see
// prisma/schema.prisma) and writes nothing.
export interface CtcResult {
  ok: boolean;
  error?: string;
  grossEarnings?: number;
  pfEmployee?: number;
  pfEmployer?: number;
  esiEmployee?: number;
  esiEmployer?: number;
  ptAmount?: number;
  fieldAllowanceTotal?: number;
  employerMonthlyCost?: number;
  employerAnnualCost?: number;
  employeeTakeHome?: number;
}

export async function calculateCtc(_prevState: CtcResult | null, formData: FormData): Promise<CtcResult> {
  const parsed = ctcCalculatorSchema.safeParse({
    basic: formData.get("basic"),
    hra: formData.get("hra"),
    da: formData.get("da"),
    conveyance: formData.get("conveyance"),
    medicalAllowance: formData.get("medicalAllowance"),
    specialAllowance: formData.get("specialAllowance"),
    state: formData.get("state"),
    pfApplicable: formData.get("pfApplicable"),
    esiApplicable: formData.get("esiApplicable"),
    dailyFieldAllowance: formData.get("dailyFieldAllowance"),
    fieldDaysPerMonth: formData.get("fieldDaysPerMonth"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const earnings: EarningsBreakup = {
    basic: parsed.data.basic,
    hra: parsed.data.hra,
    da: parsed.data.da,
    conveyance: parsed.data.conveyance,
    medicalAllowance: parsed.data.medicalAllowance,
    specialAllowance: parsed.data.specialAllowance,
  };

  const grossEarnings = grossFromEarnings(earnings);
  const basicPlusDa = earnings.basic + earnings.da;
  const pf = calculatePF(basicPlusDa, parsed.data.pfApplicable);
  const esi = calculateESI(grossEarnings, basicPlusDa, parsed.data.esiApplicable);
  const ptAmount = await calculatePT(parsed.data.state, grossEarnings, new Date());

  const fieldAllowanceTotal = (parsed.data.dailyFieldAllowance ?? 0) * (parsed.data.fieldDaysPerMonth ?? 0);

  const employerMonthlyCost =
    grossEarnings + pf.pfEmployer + pf.pfEps + pf.pfEdli + esi.esiEmployer + fieldAllowanceTotal;
  const employeeTakeHome = grossEarnings + fieldAllowanceTotal - pf.pfEmployee - esi.esiEmployee - ptAmount;

  return {
    ok: true,
    grossEarnings,
    pfEmployee: pf.pfEmployee,
    pfEmployer: pf.pfEmployer + pf.pfEps + pf.pfEdli,
    esiEmployee: esi.esiEmployee,
    esiEmployer: esi.esiEmployer,
    ptAmount,
    fieldAllowanceTotal,
    employerMonthlyCost: Math.round(employerMonthlyCost),
    employerAnnualCost: Math.round(employerMonthlyCost * 12),
    employeeTakeHome: Math.round(employeeTakeHome),
  };
}
