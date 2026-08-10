"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertSession } from "@/lib/permissions";
import { parseAttendanceImport, type ImportError } from "@/lib/attendanceImport";

export interface AttendanceUploadResult {
  ok: boolean;
  error?: string;
  uploadedCount?: number;
  rowErrors?: ImportError[];
}

// All-or-nothing, same convention as bulkUploadEmployees. Re-uploading for
// the same month upserts on (employeeId, date), so corrections are just a
// re-upload — no separate "edit attendance" UI needed.
export async function uploadAttendance(
  _prevState: AttendanceUploadResult | null,
  formData: FormData,
): Promise<AttendanceUploadResult> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

  const month = Number(formData.get("month"));
  const year = Number(formData.get("year"));
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year)) {
    return { ok: false, error: "Choose a valid month and year." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a file to upload." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { valid, errors } = await parseAttendanceImport(buffer, session.orgId, month, year);

  if (valid.length === 0 && errors.length === 0) {
    return { ok: false, error: "The file has no attendance rows." };
  }
  if (errors.length > 0) {
    return { ok: false, error: `${errors.length} row(s) had errors — fix and re-upload.`, rowErrors: errors };
  }

  await db.$transaction(
    valid.map((row) =>
      db.attendance.upsert({
        where: { employeeId_date: { employeeId: row.employeeId, date: row.date } },
        create: {
          orgId: session.orgId,
          employeeId: row.employeeId,
          date: row.date,
          present: row.present,
          hoursWorked: row.hoursWorked ?? null,
        },
        update: { present: row.present, hoursWorked: row.hoursWorked ?? null },
      }),
    ),
  );

  revalidatePath("/attendance");
  return { ok: true, uploadedCount: valid.length };
}
