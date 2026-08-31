/** Indian financial year runs April 1 – March 31. */
function formatFinancialYear(startYear: number): string {
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

/** "2026-27" -> 2026 */
function parseFinancialYearStart(financialYear: string): number {
  return Number(financialYear.slice(0, 4));
}

/** Indian financial year runs April 1 – March 31, formatted as "2026-27". */
export function financialYearFor(date: Date): string {
  const year = date.getFullYear();
  const isBeforeApril = date.getMonth() < 3; // getMonth() is 0-indexed; 3 = April
  const startYear = isBeforeApril ? year - 1 : year;
  return formatFinancialYear(startYear);
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

export interface MonthYear {
  month: number; // 1-12 calendar month
  year: number;
}

export type Quarter = 1 | 2 | 3 | 4;

/** All 12 calendar (month, year) pairs in a financial year, Apr(startYear)
 * through Mar(startYear+1), in order. */
export function monthsInFinancialYear(financialYear: string): MonthYear[] {
  const startYear = parseFinancialYearStart(financialYear);
  const months: MonthYear[] = [];
  for (let m = 4; m <= 12; m++) months.push({ month: m, year: startYear });
  for (let m = 1; m <= 3; m++) months.push({ month: m, year: startYear + 1 });
  return months;
}

/** The 3 calendar (month, year) pairs for one quarter of a financial year.
 * Q1=Apr-Jun, Q2=Jul-Sep, Q3=Oct-Dec (all startYear); Q4=Jan-Mar (startYear+1). */
export function monthsInQuarter(financialYear: string, quarter: Quarter): MonthYear[] {
  const startYear = parseFinancialYearStart(financialYear);
  const quarterStartMonths: Record<Quarter, { firstMonth: number; year: number }> = {
    1: { firstMonth: 4, year: startYear },
    2: { firstMonth: 7, year: startYear },
    3: { firstMonth: 10, year: startYear },
    4: { firstMonth: 1, year: startYear + 1 },
  };
  const { firstMonth, year } = quarterStartMonths[quarter];
  return [0, 1, 2].map((offset) => ({ month: firstMonth + offset, year }));
}

/** Inverse lookup: which financial year + quarter does a given calendar
 * (month, year) fall in? Calendar months Jan-Mar belong to Q4 of the FY that
 * started the *previous* calendar year. */
export function financialYearAndQuarterFor(month: number, year: number): { financialYear: string; quarter: Quarter } {
  if (month >= 4) {
    const quarter = (Math.floor((month - 4) / 3) + 1) as Quarter;
    return { financialYear: formatFinancialYear(year), quarter };
  }
  return { financialYear: formatFinancialYear(year - 1), quarter: 4 };
}

export function quarterLabel(financialYear: string, quarter: Quarter): string {
  const months = monthsInQuarter(financialYear, quarter);
  const first = months[0];
  const last = months[months.length - 1];
  return `Q${quarter} (${MONTH_NAMES[first.month - 1].slice(0, 3)} ${first.year} – ${MONTH_NAMES[last.month - 1].slice(0, 3)} ${last.year})`;
}

export function financialYearRangeLabel(financialYear: string): string {
  const startYear = parseFinancialYearStart(financialYear);
  return `1 April ${startYear} – 31 March ${startYear + 1}`;
}

/** Whole days from `referenceDate` to `date` (negative if `date` is in the past). */
export function daysUntil(date: Date, referenceDate: Date = new Date()): number {
  const oneDayMs = 24 * 60 * 60 * 1000;
  const startOfToday = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((startOfTarget.getTime() - startOfToday.getTime()) / oneDayMs);
}

/** The next occurrence (at or after `referenceDate`) of a birth date's month/day. */
export function nextBirthday(dob: Date, referenceDate: Date = new Date()): Date {
  const candidate = new Date(referenceDate.getFullYear(), dob.getMonth(), dob.getDate());
  const startOfToday = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  if (candidate.getTime() < startOfToday.getTime()) {
    return new Date(referenceDate.getFullYear() + 1, dob.getMonth(), dob.getDate());
  }
  return candidate;
}

/** The next occurrence (at or after `referenceDate`) of a fixed day-of-month. */
function nextDueDate(dayOfMonth: number, referenceDate: Date): Date {
  const candidate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), dayOfMonth);
  if (candidate.getTime() < new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate()).getTime()) {
    return new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, dayOfMonth);
  }
  return candidate;
}

export interface StatutoryDeadline {
  title: string;
  dueDate: Date;
  daysRemaining: number;
}

/**
 * Indicative upcoming due dates for the two statutory payments with a fixed,
 * nationwide day-of-month (EPF: 15th; TDS deposit: 7th, except TDS deducted
 * in March which is due 30 April). Professional Tax is deliberately excluded
 * — its due date varies by state and isn't modeled in this app.
 */
export function upcomingStatutoryDeadlines(referenceDate: Date = new Date()): StatutoryDeadline[] {
  const pfDue = nextDueDate(15, referenceDate);

  let tdsDue = nextDueDate(7, referenceDate);
  if (tdsDue.getMonth() === 3) {
    // TDS deducted in March is due 30 April, not 7 April.
    tdsDue = new Date(tdsDue.getFullYear(), 3, 30);
  }

  const withDaysRemaining = (title: string, dueDate: Date): StatutoryDeadline => ({
    title,
    dueDate,
    daysRemaining: daysUntil(dueDate, referenceDate),
  });

  return [
    withDaysRemaining("EPF Challan", pfDue),
    withDaysRemaining("TDS Deposit", tdsDue),
  ];
}
