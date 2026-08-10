import { NextResponse } from "next/server";
import { requireSession } from "@/lib/permissions";
import { aggregateOrgPayslipLines } from "@/lib/exports/periodAggregation";
import { buildAnnualStatutoryWorkbook } from "@/lib/exports/annualStatutoryWorkbook";
import { currentFinancialYear, monthsInFinancialYear } from "@/lib/dates";

const FY_PATTERN = /^\d{4}-\d{2}$/;

export async function GET(request: Request) {
  const session = await requireSession(["SUPERADMIN", "HR_MANAGER"]);

  const { searchParams } = new URL(request.url);
  const fy = searchParams.get("fy") ?? currentFinancialYear();
  if (!FY_PATTERN.test(fy)) {
    return NextResponse.json({ error: "Invalid financial year." }, { status: 400 });
  }

  const { employeeTotals } = await aggregateOrgPayslipLines(session.orgId, monthsInFinancialYear(fy));
  const buffer = buildAnnualStatutoryWorkbook(Array.from(employeeTotals.values()), { financialYear: fy });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Annual-Statutory-Summary-${fy}.xlsx"`,
    },
  });
}
