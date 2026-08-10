import * as XLSX from "xlsx";
import type { EmployeePeriodTotals } from "@/lib/exports/periodAggregation";
import { MONTH_NAMES } from "@/lib/dates";

function monthsIncludedLabel(totals: EmployeePeriodTotals): string {
  return totals.lines
    .map((l) => `${MONTH_NAMES[l.payrollRun.month - 1].slice(0, 3)}-${l.payrollRun.year}`)
    .join(", ");
}

export function buildAnnualStatutoryWorkbook(
  employeeTotals: EmployeePeriodTotals[],
  meta: { financialYear: string },
): Buffer {
  const wb = XLSX.utils.book_new();

  const pfRows = employeeTotals
    .filter((t) => t.pfWages > 0)
    .map((t) => ({
      "Employee Code": t.employee.employeeCode,
      Name: t.employee.name,
      UAN: t.employee.uan ?? "",
      "PF Wages (Annual)": t.pfWages,
      "Employee Contribution (EPF)": t.pfEmployee,
      "Employer Contribution (EPF)": t.pfEmployer,
      "Employer Contribution (EPS)": t.pfEps,
      "Employer Contribution (EDLI)": t.pfEdli,
      Total: t.pfEmployee + t.pfEmployer + t.pfEps + t.pfEdli,
      "Months Included": monthsIncludedLabel(t),
    }));
  const pfSheet = XLSX.utils.aoa_to_sheet([[`Financial Year: ${meta.financialYear}`]]);
  XLSX.utils.sheet_add_json(pfSheet, pfRows, { origin: "A2" });
  XLSX.utils.book_append_sheet(wb, pfSheet, "PF Summary (Annual)");

  const esiRows = employeeTotals
    .filter((t) => t.esiWages > 0)
    .map((t) => ({
      "Employee Code": t.employee.employeeCode,
      Name: t.employee.name,
      "ESI Number": t.employee.esiNumber ?? "",
      "ESI Wages (Annual)": t.esiWages,
      "Employee Contribution": t.esiEmployee,
      "Employer Contribution": t.esiEmployer,
      Total: t.esiEmployee + t.esiEmployer,
      "Months Included": monthsIncludedLabel(t),
    }));
  const esiSheet = XLSX.utils.aoa_to_sheet([[`Financial Year: ${meta.financialYear}`]]);
  XLSX.utils.sheet_add_json(esiSheet, esiRows, { origin: "A2" });
  XLSX.utils.book_append_sheet(wb, esiSheet, "ESI Working (Annual)");

  const ptRows = employeeTotals
    .filter((t) => t.ptAmount > 0)
    .map((t) => ({
      "Employee Code": t.employee.employeeCode,
      Name: t.employee.name,
      State: t.employee.state,
      "Gross Earnings (Annual)": t.grossEarnings,
      "Professional Tax (Annual)": t.ptAmount,
      "Months Included": monthsIncludedLabel(t),
    }));
  const ptSheet = XLSX.utils.aoa_to_sheet([[`Financial Year: ${meta.financialYear}`]]);
  XLSX.utils.sheet_add_json(ptSheet, ptRows, { origin: "A2" });
  XLSX.utils.book_append_sheet(wb, ptSheet, "PT Summary (Annual)");

  return XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as Buffer;
}
