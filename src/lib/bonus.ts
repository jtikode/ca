// Payment of Bonus Act defaults. The calculation ceiling is the higher of
// 7,000 and the state minimum wage, so it is editable per run in the UI; the
// eligibility limit is monthly wages (basic plus DA) of 21,000 or less.
export const BONUS_DEFAULT_CEILING = 7000;
export const BONUS_ELIGIBILITY_WAGE_LIMIT = 21000;
export const BONUS_MIN_RATE = 8.33;
export const BONUS_MAX_RATE = 20;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Months of service inside a financial year, approximated from days (a
 * full 30 day month counts as one). Returns 0 to 12. */
export function bonusMonthsInFinancialYear(financialYear: string, doj: Date, dol: Date | null): number {
  const startYear = Number(financialYear.slice(0, 4));
  const fyStart = new Date(Date.UTC(startYear, 3, 1));
  const fyEnd = new Date(Date.UTC(startYear + 1, 2, 31));
  const start = Math.max(doj.getTime(), fyStart.getTime());
  const end = Math.min(dol ? dol.getTime() : fyEnd.getTime(), fyEnd.getTime());
  if (end < start) return 0;
  const days = (end - start) / DAY_MS + 1;
  return Math.min(12, Math.max(0, Math.round(days / 30.4375)));
}

export function calculateBonus(basicPlusDa: number, months: number, ratePercent: number, ceiling: number): number {
  const wage = Math.min(basicPlusDa, ceiling);
  return Math.round((wage * months * ratePercent) / 100);
}
