import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/permissions";
import { buildForm16PartBBuffer } from "@/lib/form16";
import { currentFinancialYear } from "@/lib/dates";

const FY_PATTERN = /^\d{4}-\d{2}$/;

export async function GET(request: Request, { params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params;
  const session = await requireSession(["SUPERADMIN", "HR_MANAGER"]);

  const { searchParams } = new URL(request.url);
  const fy = searchParams.get("fy") ?? currentFinancialYear();
  if (!FY_PATTERN.test(fy)) {
    return NextResponse.json({ error: "Invalid financial year." }, { status: 400 });
  }

  const result = await buildForm16PartBBuffer(session.orgId, employeeId, fy);
  if (!result.ok) {
    if (result.error === "Employee not found.") notFound();
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return new Response(new Uint8Array(result.result.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Form16-PartB-${result.result.employeeCode}-${fy}.pdf"`,
    },
  });
}
