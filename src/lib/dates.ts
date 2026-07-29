/** Indian financial year runs April 1 – March 31, formatted as "2026-27". */
export function financialYearFor(date: Date): string {
  const year = date.getFullYear();
  const isBeforeApril = date.getMonth() < 3; // getMonth() is 0-indexed; 3 = April
  const startYear = isBeforeApril ? year - 1 : year;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

export function currentFinancialYear(): string {
  return financialYearFor(new Date());
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}
