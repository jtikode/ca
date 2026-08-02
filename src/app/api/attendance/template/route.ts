import { requireSession } from "@/lib/permissions";
import { buildAttendanceTemplateWorkbook } from "@/lib/attendanceImport";

export async function GET() {
  await requireSession(["SUPERADMIN", "HR_MANAGER"]);

  const buffer = buildAttendanceTemplateWorkbook();

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="attendance-upload-template.xlsx"`,
    },
  });
}
