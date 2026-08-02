import { notFound } from "next/navigation";
import { requireSession } from "@/lib/permissions";
import { buildPayslipPdfBuffer } from "@/lib/payslipPdf";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string; employeeId: string }> },
) {
  const { runId, employeeId } = await params;
  const session = await requireSession();

  // EMPLOYEE logins may only ever fetch their own payslip.
  if (session.role === "EMPLOYEE" && session.employeeId !== employeeId) {
    notFound();
  }

  const result = await buildPayslipPdfBuffer(runId, employeeId, session.orgId);
  if (!result) notFound();

  return new Response(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="payslip-${result.employeeCode}-${result.month}-${result.year}.pdf"`,
    },
  });
}
