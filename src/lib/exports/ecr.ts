import type { PayslipLine, Employee } from "@/generated/prisma/client";

// Mirrors the official EPFO "Electronic Challan cum Return (ECR) File
// Format (For Employers)" PDF (epfindia.gov.in/site_docs/PDFs/OnlineECR_PDFs/
// ECR_ForEmployers_FileStructure---2.pdf), fetched and verified 2026-07-29:
// plain text, one line per member, 25 #~# (hash-tilda-hash) delimited
// fields. That PDF's sample data uses a legacy 7-digit "Member ID" rather
// than a full UAN — EPFO's UAN-based portal may expect the UAN in that slot
// instead. Diff the output against a real upload template on the current
// EPFO employer portal before filing with it.
const DELIMITER = "#~#";

function n(value: number | null | undefined): string {
  return value ? String(Math.round(value)) : "";
}

export function generateECRText(
  lines: (PayslipLine & { employee: Employee })[],
): string {
  const rows = lines.map((line) => {
    const ncpDays = Math.max(0, line.daysInMonth - Number(line.daysPaid));

    const fields = [
      line.employee.uan ?? "",
      line.employee.name,
      n(Number(line.pfWages)),
      n(Number(line.pfWages)), // EPS wages: same capped base as PF wages in this MVP
      n(Number(line.pfEmployee)), // EPF EE share due
      n(Number(line.pfEmployee)), // EPF EE share remitted (assumes full remittance)
      n(Number(line.pfEps)), // EPS contribution due
      n(Number(line.pfEps)), // EPS contribution remitted
      n(Number(line.pfEmployer)), // Diff EPF/EPS ER share due
      n(Number(line.pfEmployer)), // Diff EPF/EPS ER share remitted
      String(ncpDays), // NCP days
      "", // Refund of advances
      "", // Arrear EPF wages
      "", // Arrear EPF EE share
      "", // Arrear EPF ER share
      "", // Arrear EPS
      "", // Father's/Husband's name (new joiners only)
      "", // Relationship (new joiners only)
      "", // Date of birth (new joiners only)
      "", // Gender (new joiners only)
      "", // Date of joining EPF (new joiners only)
      "", // Date of joining EPS (new joiners only)
      "", // Date of exit EPF (exiting members only)
      "", // Date of exit EPS (exiting members only)
      "", // Reason for leaving (exiting members only)
    ];

    return fields.join(DELIMITER);
  });

  return rows.join("\r\n") + "\r\n";
}
