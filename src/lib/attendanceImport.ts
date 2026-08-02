import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { attendanceImportRowSchema } from "@/lib/validators";
import { daysInMonth as daysInMonthOf } from "@/lib/dates";

const TEMPLATE_COLUMNS = ["employeeCode", "date", "status", "timeIn", "timeOut"] as const;

const EXAMPLE_ROWS: Record<(typeof TEMPLATE_COLUMNS)[number], string>[] = [
  { employeeCode: "E101", date: "2026-04-01", status: "Present", timeIn: "09:00", timeOut: "14:00" },
  { employeeCode: "E101", date: "2026-04-02", status: "Absent", timeIn: "", timeOut: "" },
];

export function buildAttendanceTemplateWorkbook(): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(EXAMPLE_ROWS, { header: [...TEMPLATE_COLUMNS] });
  ws["!cols"] = TEMPLATE_COLUMNS.map((c) => ({ wch: Math.max(c.length, 12) }));
  XLSX.utils.book_append_sheet(wb, ws, "Attendance");
  return XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as Buffer;
}

export interface ImportError {
  row: number;
  message: string;
}

export interface ParsedAttendanceRow {
  employeeId: string;
  date: Date;
  present: boolean;
}

// One row per employee per day. timeIn/timeOut columns are accepted in the
// template for future use but not parsed into any column yet — only
// present/absent drives the payroll calculation today.
export async function parseAttendanceImport(
  buffer: Buffer,
  orgId: string,
  month: number,
  year: number,
): Promise<{ valid: ParsedAttendanceRow[]; errors: ImportError[] }> {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  const meaningfulRows = rows.filter((r) => r.employeeCode || r.date);

  const employees = await db.employee.findMany({ where: { orgId }, select: { id: true, employeeCode: true } });
  const codeToId = new Map(employees.map((e) => [e.employeeCode, e.id]));

  const monthStart = new Date(year, month - 1, 1);
  const monthEndExclusive = new Date(year, month, 1);
  const totalDaysInMonth = daysInMonthOf(month, year);

  const errors: ImportError[] = [];
  const valid: ParsedAttendanceRow[] = [];
  const seenKeys = new Set<string>();

  meaningfulRows.forEach((raw, i) => {
    const rowNum = i + 2; // header is row 1
    const parsed = attendanceImportRowSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push({ row: rowNum, message: parsed.error.issues[0]?.message ?? "Invalid row." });
      return;
    }

    const employeeId = codeToId.get(parsed.data.employeeCode);
    if (!employeeId) {
      errors.push({ row: rowNum, message: `Unknown employee code "${parsed.data.employeeCode}".` });
      return;
    }

    if (parsed.data.date < monthStart || parsed.data.date >= monthEndExclusive) {
      errors.push({
        row: rowNum,
        message: `Date must fall within the selected month (${totalDaysInMonth} days).`,
      });
      return;
    }

    const key = `${employeeId}:${parsed.data.date.toISOString().slice(0, 10)}`;
    if (seenKeys.has(key)) {
      errors.push({ row: rowNum, message: `Duplicate row for ${parsed.data.employeeCode} on this date.` });
      return;
    }
    seenKeys.add(key);

    valid.push({ employeeId, date: parsed.data.date, present: parsed.data.present });
  });

  return { valid, errors };
}
