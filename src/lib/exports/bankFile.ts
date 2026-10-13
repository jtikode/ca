import { MONTH_NAMES } from "@/lib/dates";

export interface BankFileLine {
  employeeCode: string;
  name: string;
  bankAccountNo: string | null;
  bankIfsc: string | null;
  netPay: number;
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Splits a run into payable rows (net pay above zero and complete bank
 * details) and rows that cannot be paid by transfer yet. */
export function splitBankLines(lines: BankFileLine[]) {
  const payable: BankFileLine[] = [];
  const missingDetails: BankFileLine[] = [];
  for (const l of lines) {
    if (l.netPay <= 0) continue;
    if (l.bankAccountNo && l.bankIfsc) payable.push(l);
    else missingDetails.push(l);
  }
  return { payable, missingDetails };
}

/** A plain bulk payment CSV. Banks differ on exact upload layouts, so this
 * carries the fields every bulk upload template asks for and leaves any
 * bank specific reshuffling to the accountant or the bank's template. */
export function buildBankFileCsv(lines: BankFileLine[], month: number, year: number): string {
  const narration = `Salary ${MONTH_NAMES[month - 1]} ${year}`;
  const header = ["Beneficiary Name", "Account Number", "IFSC", "Amount", "Narration", "Employee Code"];
  const rows = lines.map((l) =>
    [l.name, l.bankAccountNo ?? "", l.bankIfsc ?? "", l.netPay.toFixed(2), narration, l.employeeCode]
      .map(csvCell)
      .join(","),
  );
  return [header.join(","), ...rows].join("\r\n") + "\r\n";
}
