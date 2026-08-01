import { requireSession } from "@/lib/permissions";
import { buildEmployeeTemplateWorkbook } from "@/lib/employeeImport";

export async function GET() {
  await requireSession(["SUPERADMIN", "HR_MANAGER"]);

  const buffer = buildEmployeeTemplateWorkbook();

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="employee-upload-template.xlsx"`,
    },
  });
}
