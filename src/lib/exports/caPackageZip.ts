import { db } from "@/lib/db";
import { aggregateOrgPayslipLines } from "@/lib/exports/periodAggregation";
import { buildAnnualStatutoryWorkbook } from "@/lib/exports/annualStatutoryWorkbook";
import { buildForm24QWorkbook } from "@/lib/exports/form24qWorkbook";
import { buildForm16PartBBuffer } from "@/lib/form16";
import { zipFromEntries } from "@/lib/exports/zip";
import { monthsInFinancialYear, monthsInQuarter, quarterLabel, type Quarter } from "@/lib/dates";

/** One-click bundle of everything on the Reports page for a financial year —
 * Form 16 Part B per employee, Form 24Q for all four quarters, and the
 * annual PF/ESI/PT summary — so the CA doesn't have to download each
 * report separately. Reuses the same generation functions as the
 * individual downloads; this is packaging, not a separate computation. */
export async function buildAnnualCAPackageZip(
  orgId: string,
  financialYear: string,
): Promise<{ ok: true; buffer: Buffer } | { ok: false; error: string }> {
  const org = await db.organization.findUniqueOrThrow({ where: { id: orgId } });
  if (!org.pan || !org.tan) {
    return { ok: false, error: "Add your company's PAN and TAN in Settings before generating a CA package." };
  }

  const entries: { name: string; content: Buffer }[] = [];

  const { employeeTotals: annualTotals } = await aggregateOrgPayslipLines(orgId, monthsInFinancialYear(financialYear));
  entries.push({
    name: `Annual-Statutory-Summary-${financialYear}.xlsx`,
    content: buildAnnualStatutoryWorkbook(Array.from(annualTotals.values()), { financialYear }),
  });

  for (const quarter of [1, 2, 3, 4] as Quarter[]) {
    const { employeeTotals } = await aggregateOrgPayslipLines(orgId, monthsInQuarter(financialYear, quarter));
    entries.push({
      name: `Form24Q/${quarterLabel(financialYear, quarter).replace(/\s+/g, "-")}.xlsx`,
      content: buildForm24QWorkbook(Array.from(employeeTotals.values()), { financialYear, quarter }),
    });
  }

  for (const totals of annualTotals.values()) {
    if (totals.grossEarnings <= 0) continue;
    const result = await buildForm16PartBBuffer(orgId, totals.employeeId, financialYear);
    if (!result.ok) continue;
    entries.push({
      name: `Form16-PartB/${result.result.employeeCode}-${result.result.employeeName}.pdf`,
      content: result.result.buffer,
    });
  }

  return { ok: true, buffer: await zipFromEntries(entries) };
}
