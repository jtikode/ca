import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { employeeImportRowSchema } from "@/lib/validators";

const TEMPLATE_COLUMNS = [
  "employeeCode",
  "name",
  "doj",
  "dob",
  "gender",
  "pan",
  "uan",
  "esiNumber",
  "bankAccountNo",
  "bankIfsc",
  "state",
  "pfApplicable",
  "esiApplicable",
  "basic",
  "hra",
  "conveyance",
  "medicalAllowance",
  "specialAllowance",
  "designation",
  "employmentStage",
  "employmentBasis",
  "employeeCategory",
] as const;

const EXAMPLE_ROW: Record<(typeof TEMPLATE_COLUMNS)[number], string | number> = {
  employeeCode: "E101",
  name: "Priya Sharma",
  doj: "2026-04-01",
  dob: "1995-06-15",
  gender: "Female",
  pan: "ABCDE1234F",
  uan: "",
  esiNumber: "",
  bankAccountNo: "123456789012",
  bankIfsc: "HDFC0001234",
  state: "Maharashtra",
  pfApplicable: "TRUE",
  esiApplicable: "TRUE",
  basic: 20000,
  hra: 8000,
  conveyance: 1600,
  medicalAllowance: 1250,
  specialAllowance: 0,
  designation: "Sales Executive",
  employmentStage: "PROBATION",
  employmentBasis: "PERMANENT",
  employeeCategory: "NON_MANAGERIAL",
};

export function buildEmployeeTemplateWorkbook(): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet([EXAMPLE_ROW], { header: [...TEMPLATE_COLUMNS] });
  ws["!cols"] = TEMPLATE_COLUMNS.map((c) => ({ wch: Math.max(c.length, 12) }));
  XLSX.utils.book_append_sheet(wb, ws, "Employees");
  return XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as Buffer;
}

export interface ImportError {
  row: number;
  message: string;
}

export type ParsedEmployeeRow = ReturnType<typeof employeeImportRowSchema.parse>;

export async function parseEmployeeImport(
  buffer: Buffer,
  orgId: string,
): Promise<{ valid: ParsedEmployeeRow[]; errors: ImportError[] }> {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  const meaningfulRows = rows.filter((r) => r.employeeCode || r.name);

  const existingCodes = new Set(
    (await db.employee.findMany({ where: { orgId }, select: { employeeCode: true } })).map((e) => e.employeeCode),
  );

  const errors: ImportError[] = [];
  const valid: ParsedEmployeeRow[] = [];
  const seenCodes = new Set<string>();

  meaningfulRows.forEach((raw, i) => {
    const rowNum = i + 2; // header is row 1
    const parsed = employeeImportRowSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push({ row: rowNum, message: parsed.error.issues[0]?.message ?? "Invalid row." });
      return;
    }
    if (seenCodes.has(parsed.data.employeeCode) || existingCodes.has(parsed.data.employeeCode)) {
      errors.push({ row: rowNum, message: `Employee code "${parsed.data.employeeCode}" is already in use.` });
      return;
    }
    seenCodes.add(parsed.data.employeeCode);
    valid.push(parsed.data);
  });

  return { valid, errors };
}
