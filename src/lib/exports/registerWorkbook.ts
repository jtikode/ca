import * as XLSX from "xlsx";
import type { PayslipLine, Employee } from "@/generated/prisma/client";

type LineWithEmployee = PayslipLine & { employee: Employee };

function num(v: unknown): number {
  return Number(v);
}

export function buildCAExportWorkbook(lines: LineWithEmployee[]): Buffer {
  const wb = XLSX.utils.book_new();

  const register = lines.map((l) => ({
    "Employee Code": l.employee.employeeCode,
    Name: l.employee.name,
    "Days Paid": num(l.daysPaid),
    "Gross Earnings": num(l.grossEarnings),
    "PF Wages": num(l.pfWages),
    "PF Employee": num(l.pfEmployee),
    "PF Employer": num(l.pfEmployer),
    "PF EPS": num(l.pfEps),
    "PF EDLI": num(l.pfEdli),
    "ESI Wages": num(l.esiWages),
    "ESI Employee": num(l.esiEmployee),
    "ESI Employer": num(l.esiEmployer),
    "Professional Tax": num(l.ptAmount),
    TDS: num(l.tdsAmount),
    "Net Pay": num(l.netPay),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(register), "Payroll Register");

  const pfSheet = lines
    .filter((l) => num(l.pfWages) > 0)
    .map((l) => ({
      "Employee Code": l.employee.employeeCode,
      Name: l.employee.name,
      UAN: l.employee.uan ?? "",
      "PF Wages": num(l.pfWages),
      "Employee Contribution (EPF)": num(l.pfEmployee),
      "Employer Contribution (EPF)": num(l.pfEmployer),
      "Employer Contribution (EPS)": num(l.pfEps),
      "Employer Contribution (EDLI)": num(l.pfEdli),
      Total: num(l.pfEmployee) + num(l.pfEmployer) + num(l.pfEps) + num(l.pfEdli),
    }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pfSheet), "PF Summary");

  const esiSheet = lines
    .filter((l) => num(l.esiWages) > 0)
    .map((l) => ({
      "Employee Code": l.employee.employeeCode,
      Name: l.employee.name,
      "ESI Number": l.employee.esiNumber ?? "",
      "ESI Wages": num(l.esiWages),
      "Employee Contribution": num(l.esiEmployee),
      "Employer Contribution": num(l.esiEmployer),
      Total: num(l.esiEmployee) + num(l.esiEmployer),
    }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(esiSheet), "ESI Working");

  const ptSheet = lines
    .filter((l) => num(l.ptAmount) > 0)
    .map((l) => ({
      "Employee Code": l.employee.employeeCode,
      Name: l.employee.name,
      State: l.employee.state,
      "Gross Earnings": num(l.grossEarnings),
      "Professional Tax": num(l.ptAmount),
    }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ptSheet), "PT Summary");

  const tdsSheet = lines
    .filter((l) => num(l.tdsAmount) > 0)
    .map((l) => ({
      "Employee Code": l.employee.employeeCode,
      Name: l.employee.name,
      PAN: l.employee.pan ?? "",
      "Gross Earnings (month)": num(l.grossEarnings),
      "TDS (month, estimated)": num(l.tdsAmount),
    }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tdsSheet), "TDS Working");

  return XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as Buffer;
}
