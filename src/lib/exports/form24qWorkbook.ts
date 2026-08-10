import * as XLSX from "xlsx";
import type { EmployeePeriodTotals } from "@/lib/exports/periodAggregation";
import { MONTH_NAMES, quarterLabel, type Quarter } from "@/lib/dates";

function monthsIncludedLabel(totals: EmployeePeriodTotals): string {
  return totals.lines
    .map((l) => `${MONTH_NAMES[l.payrollRun.month - 1].slice(0, 3)}-${l.payrollRun.year}`)
    .join(", ");
}

export function buildForm24QWorkbook(
  employeeTotals: EmployeePeriodTotals[],
  meta: { financialYear: string; quarter: Quarter },
): Buffer {
  const wb = XLSX.utils.book_new();

  const rows = employeeTotals
    .filter((t) => t.tdsAmount > 0)
    .map((t) => ({
      "Employee Code": t.employee.employeeCode,
      Name: t.employee.name,
      PAN: t.employee.pan ?? "",
      Designation: t.employee.designation ?? "",
      "Gross Salary (Quarter)": t.grossEarnings,
      "TDS Deducted (Quarter)": t.tdsAmount,
      "Months Included": monthsIncludedLabel(t),
    }));

  const ws = XLSX.utils.aoa_to_sheet([
    [`Financial Year: ${meta.financialYear}`],
    [`Period: ${quarterLabel(meta.financialYear, meta.quarter)}`],
  ]);
  XLSX.utils.sheet_add_json(ws, rows, { origin: "A3" });
  XLSX.utils.book_append_sheet(wb, ws, "24Q TDS Summary");

  return XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as Buffer;
}
