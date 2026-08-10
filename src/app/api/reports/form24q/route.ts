import { NextResponse } from "next/server";
import { requireSession } from "@/lib/permissions";
import { aggregateOrgPayslipLines } from "@/lib/exports/periodAggregation";
import { buildForm24QWorkbook } from "@/lib/exports/form24qWorkbook";
import { currentFinancialYear, financialYearAndQuarterFor, monthsInQuarter, type Quarter } from "@/lib/dates";

const FY_PATTERN = /^\d{4}-\d{2}$/;

export async function GET(request: Request) {
  const session = await requireSession(["SUPERADMIN", "HR_MANAGER"]);

  const { searchParams } = new URL(request.url);
  const fy = searchParams.get("fy") ?? currentFinancialYear();
  const now = new Date();
  const defaultQuarter = financialYearAndQuarterFor(now.getMonth() + 1, now.getFullYear()).quarter;
  const quarterParam = Number(searchParams.get("quarter") ?? defaultQuarter);

  if (!FY_PATTERN.test(fy)) {
    return NextResponse.json({ error: "Invalid financial year." }, { status: 400 });
  }
  if (![1, 2, 3, 4].includes(quarterParam)) {
    return NextResponse.json({ error: "Invalid quarter." }, { status: 400 });
  }
  const quarter = quarterParam as Quarter;

  const { employeeTotals } = await aggregateOrgPayslipLines(session.orgId, monthsInQuarter(fy, quarter));
  const buffer = buildForm24QWorkbook(Array.from(employeeTotals.values()), { financialYear: fy, quarter });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Form24Q-Q${quarter}-${fy}.xlsx"`,
    },
  });
}
