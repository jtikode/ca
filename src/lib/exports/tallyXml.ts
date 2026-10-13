import { MONTH_NAMES } from "@/lib/dates";

export interface TallyRunTotals {
  netPay: number;
  pfEmployee: number;
  pfEmployerTotal: number; // employer EPF share + EPS + EDLI
  esiEmployee: number;
  esiEmployer: number;
  pt: number;
  tds: number;
}

export const TALLY_LEDGERS = {
  salaryExpense: "Salary and Wages",
  employerPfExpense: "Employer PF Contribution",
  employerEsiExpense: "Employer ESI Contribution",
  salaryPayable: "Salary Payable",
  pfPayable: "PF Payable",
  esiPayable: "ESI Payable",
  ptPayable: "Professional Tax Payable",
  tdsPayable: "TDS on Salary Payable",
} as const;

function esc(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function ledgerMaster(name: string, parent: string): string {
  return `<TALLYMESSAGE xmlns:UDF="TallyUDF"><LEDGER NAME="${esc(name)}" ACTION="Create"><NAME.LIST><NAME>${esc(name)}</NAME></NAME.LIST><PARENT>${esc(parent)}</PARENT></LEDGER></TALLYMESSAGE>`;
}

function entry(ledger: string, isDebit: boolean, amount: number): string {
  // In Tally's XML a debit entry is ISDEEMEDPOSITIVE=Yes with a negative amount.
  const signed = isDebit ? -amount : amount;
  return `<ALLLEDGERENTRIES.LIST><LEDGERNAME>${esc(ledger)}</LEDGERNAME><ISDEEMEDPOSITIVE>${isDebit ? "Yes" : "No"}</ISDEEMEDPOSITIVE><AMOUNT>${signed.toFixed(2)}</AMOUNT></ALLLEDGERENTRIES.LIST>`;
}

/** One Journal voucher for a finalized month, plus the ledger masters it
 * needs. Salary expense is the balancing figure (net pay plus employee side
 * deductions), so any non statutory deduction such as a loan recovery is
 * netted inside it rather than posted to its own ledger. */
export function buildTallyPayrollXml(totals: TallyRunTotals, month: number, year: number): string {
  const salaryExpense =
    totals.netPay + totals.pfEmployee + totals.esiEmployee + totals.pt + totals.tds;
  const pfPayable = totals.pfEmployee + totals.pfEmployerTotal;
  const esiPayable = totals.esiEmployee + totals.esiEmployer;

  const lastDay = new Date(year, month, 0).getDate();
  const date = `${year}${String(month).padStart(2, "0")}${String(lastDay).padStart(2, "0")}`;
  const narration = `Payroll for ${MONTH_NAMES[month - 1]} ${year} (TimHr)`;

  const lines = [
    entry(TALLY_LEDGERS.salaryExpense, true, salaryExpense),
    totals.pfEmployerTotal > 0 ? entry(TALLY_LEDGERS.employerPfExpense, true, totals.pfEmployerTotal) : "",
    totals.esiEmployer > 0 ? entry(TALLY_LEDGERS.employerEsiExpense, true, totals.esiEmployer) : "",
    entry(TALLY_LEDGERS.salaryPayable, false, totals.netPay),
    pfPayable > 0 ? entry(TALLY_LEDGERS.pfPayable, false, pfPayable) : "",
    esiPayable > 0 ? entry(TALLY_LEDGERS.esiPayable, false, esiPayable) : "",
    totals.pt > 0 ? entry(TALLY_LEDGERS.ptPayable, false, totals.pt) : "",
    totals.tds > 0 ? entry(TALLY_LEDGERS.tdsPayable, false, totals.tds) : "",
  ].join("");

  const masters = [
    ledgerMaster(TALLY_LEDGERS.salaryExpense, "Indirect Expenses"),
    ledgerMaster(TALLY_LEDGERS.employerPfExpense, "Indirect Expenses"),
    ledgerMaster(TALLY_LEDGERS.employerEsiExpense, "Indirect Expenses"),
    ledgerMaster(TALLY_LEDGERS.salaryPayable, "Current Liabilities"),
    ledgerMaster(TALLY_LEDGERS.pfPayable, "Duties & Taxes"),
    ledgerMaster(TALLY_LEDGERS.esiPayable, "Duties & Taxes"),
    ledgerMaster(TALLY_LEDGERS.ptPayable, "Duties & Taxes"),
    ledgerMaster(TALLY_LEDGERS.tdsPayable, "Duties & Taxes"),
  ].join("");

  const voucher = `<TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER VCHTYPE="Journal" ACTION="Create"><DATE>${date}</DATE><VOUCHERTYPENAME>Journal</VOUCHERTYPENAME><NARRATION>${esc(narration)}</NARRATION>${lines}</VOUCHER></TALLYMESSAGE>`;

  // One envelope: ledger masters first, then the voucher that uses them.
  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC><REQUESTDATA>${masters}${voucher}</REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>
`;
}
