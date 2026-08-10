import { NextResponse } from "next/server";
import { requireSession } from "@/lib/permissions";
import { buildAllForm16PartBZip } from "@/lib/form16";
import { currentFinancialYear } from "@/lib/dates";

const FY_PATTERN = /^\d{4}-\d{2}$/;

export async function GET(request: Request) {
  const session = await requireSession(["SUPERADMIN", "HR_MANAGER"]);

  const { searchParams } = new URL(request.url);
  const fy = searchParams.get("fy") ?? currentFinancialYear();
  if (!FY_PATTERN.test(fy)) {
    return NextResponse.json({ error: "Invalid financial year." }, { status: 400 });
  }

  const result = await buildAllForm16PartBZip(session.orgId, fy);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return new Response(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="Form16-PartB-All-${fy}.zip"`,
    },
  });
}
