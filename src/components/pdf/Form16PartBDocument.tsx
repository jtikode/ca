import { Document, Page, Text, View, Image } from "@react-pdf/renderer";
import { letterStyles, formatDate, inr } from "@/components/pdf/letterStyles";
import { Form16PartBDisclaimer } from "@/components/pdf/Form16PartBDisclaimer";
import { MONTH_NAMES } from "@/lib/dates";
import type { Form16PartBData } from "@/lib/form16";

const RECONCILIATION_THRESHOLD_ABS = 500;
const RECONCILIATION_THRESHOLD_PCT = 0.02;

export function Form16PartBDocument(data: Form16PartBData) {
  const {
    orgName,
    orgLogoUrl,
    orgAddress,
    orgPan,
    orgTan,
    employeeName,
    employeeCode,
    employeePan,
    designation,
    financialYear,
    assessmentYear,
    periodLabel,
    regime,
    hasTaxDeclaration,
    hasFinalizedData,
    computation,
    grossSalaryActual,
    otherIncomeDeclared,
    totalTdsDeductedActual,
    quarterlyBreakup,
    monthsMissing,
    generatedOn,
  } = data;

  const diff = Math.abs(computation.totalTax - totalTdsDeductedActual);
  const showReconciliationNote =
    diff > RECONCILIATION_THRESHOLD_ABS &&
    diff > RECONCILIATION_THRESHOLD_PCT * Math.max(computation.totalTax, totalTdsDeductedActual, 1);

  return (
    <Document>
      <Page size="A4" style={letterStyles.page}>
        <View style={letterStyles.header}>
          {orgLogoUrl && <Image src={orgLogoUrl} style={letterStyles.logo} />}
          <Text style={letterStyles.orgName}>{orgName}</Text>
          <Text style={letterStyles.orgAddress}>{orgAddress}</Text>
        </View>

        <Text style={letterStyles.title}>FORM 16 – PART B (ANNEXURE)</Text>
        <Text style={[letterStyles.orgAddress, { marginTop: -8, marginBottom: 12 }]}>
          Details of Salary Paid and Tax Deducted — this is Part B only, not a complete Form 16 certificate.
        </Text>

        {!hasFinalizedData && (
          <Text style={[letterStyles.paragraph, { color: "#b45309", fontWeight: 700 }]}>
            No finalized payroll was found for this employee in {financialYear}. Figures below are zero.
          </Text>
        )}

        <Text style={letterStyles.sectionTitle}>Deductor (Employer) Details</Text>
        <View style={letterStyles.section}>
          <View style={letterStyles.row}>
            <Text style={letterStyles.label}>Name</Text>
            <Text style={letterStyles.value}>{orgName}</Text>
          </View>
          <View style={letterStyles.row}>
            <Text style={letterStyles.label}>Address</Text>
            <Text style={letterStyles.value}>{orgAddress}</Text>
          </View>
          <View style={letterStyles.row}>
            <Text style={letterStyles.label}>PAN</Text>
            <Text style={letterStyles.value}>{orgPan}</Text>
          </View>
          <View style={letterStyles.row}>
            <Text style={letterStyles.label}>TAN</Text>
            <Text style={letterStyles.value}>{orgTan}</Text>
          </View>
        </View>

        <Text style={letterStyles.sectionTitle}>Employee Details</Text>
        <View style={letterStyles.section}>
          <View style={letterStyles.row}>
            <Text style={letterStyles.label}>Name</Text>
            <Text style={letterStyles.value}>{employeeName}</Text>
          </View>
          <View style={letterStyles.row}>
            <Text style={letterStyles.label}>Employee Code</Text>
            <Text style={letterStyles.value}>{employeeCode}</Text>
          </View>
          <View style={letterStyles.row}>
            <Text style={letterStyles.label}>PAN</Text>
            <Text style={letterStyles.value}>{employeePan}</Text>
          </View>
          <View style={letterStyles.row}>
            <Text style={letterStyles.label}>Designation</Text>
            <Text style={letterStyles.value}>{designation}</Text>
          </View>
        </View>

        <View style={letterStyles.section}>
          <View style={letterStyles.row}>
            <Text style={letterStyles.label}>Financial Year</Text>
            <Text style={letterStyles.value}>
              {financialYear} ({periodLabel})
            </Text>
          </View>
          <View style={letterStyles.row}>
            <Text style={letterStyles.label}>Assessment Year</Text>
            <Text style={letterStyles.value}>{assessmentYear}</Text>
          </View>
          <View style={letterStyles.row}>
            <Text style={letterStyles.label}>Tax Regime</Text>
            <Text style={letterStyles.value}>{regime === "OLD" ? "Old Regime" : "New Regime"}</Text>
          </View>
        </View>

        <Text style={letterStyles.sectionTitle}>Salary &amp; Taxable Income Computation</Text>
        <View style={letterStyles.table}>
          <View style={letterStyles.tableRow}>
            <Text style={letterStyles.tableCellLabel}>Gross Salary Paid (Actual, FY)</Text>
            <Text style={letterStyles.tableCellValue}>{inr(grossSalaryActual)}</Text>
          </View>
          <View style={letterStyles.tableRow}>
            <Text style={letterStyles.tableCellLabel}>Less: HRA Exemption u/s 10(13A)</Text>
            <Text style={letterStyles.tableCellValue}>
              {regime === "OLD" ? inr(computation.hraExemption) : "Not applicable — New Regime"}
            </Text>
          </View>
          <View style={letterStyles.tableRow}>
            <Text style={letterStyles.tableCellLabel}>Less: Standard Deduction</Text>
            <Text style={letterStyles.tableCellValue}>{inr(computation.standardDeduction)}</Text>
          </View>
          <View style={letterStyles.tableRow}>
            <Text style={letterStyles.tableCellLabel}>Add: Other Income (as declared)</Text>
            <Text style={letterStyles.tableCellValue}>{inr(otherIncomeDeclared)}</Text>
          </View>
          <View style={letterStyles.tableRow}>
            <Text style={letterStyles.tableCellLabel}>Gross Total Income</Text>
            <Text style={letterStyles.tableCellValue}>{inr(computation.grossTotalIncome)}</Text>
          </View>
          <View style={letterStyles.tableRow}>
            <Text style={letterStyles.tableCellLabel}>Less: Deduction u/s 80C (capped ₹1,50,000)</Text>
            <Text style={letterStyles.tableCellValue}>
              {regime === "OLD" ? inr(computation.section80CApplied) : "Not applicable — New Regime"}
            </Text>
          </View>
          <View style={letterStyles.tableRow}>
            <Text style={letterStyles.tableCellLabel}>Less: Deduction u/s 80D</Text>
            <Text style={letterStyles.tableCellValue}>
              {regime === "OLD" ? inr(computation.section80DApplied) : "Not applicable — New Regime"}
            </Text>
          </View>
          <View style={letterStyles.tableRow}>
            <Text style={letterStyles.tableCellLabel}>Less: Home Loan Interest u/s 24(b) (capped ₹2,00,000)</Text>
            <Text style={letterStyles.tableCellValue}>
              {regime === "OLD" ? inr(computation.homeLoanInterestApplied) : "Not applicable — New Regime"}
            </Text>
          </View>
          <View style={letterStyles.tableRow}>
            <Text style={[letterStyles.tableCellLabel, { fontWeight: 700 }]}>Total Taxable Income</Text>
            <Text style={[letterStyles.tableCellValue, { fontWeight: 700 }]}>{inr(computation.taxableIncome)}</Text>
          </View>
        </View>

        <Text style={letterStyles.sectionTitle}>Tax Computation</Text>
        <View style={letterStyles.table}>
          <View style={letterStyles.tableRow}>
            <Text style={letterStyles.tableCellLabel}>Tax on Total Income (slab-wise)</Text>
            <Text style={letterStyles.tableCellValue}>{inr(computation.taxBeforeRebate)}</Text>
          </View>
          <View style={letterStyles.tableRow}>
            <Text style={letterStyles.tableCellLabel}>Less: Rebate u/s 87A</Text>
            <Text style={letterStyles.tableCellValue}>{inr(computation.rebateApplied)}</Text>
          </View>
          <View style={letterStyles.tableRow}>
            <Text style={letterStyles.tableCellLabel}>Tax After Rebate</Text>
            <Text style={letterStyles.tableCellValue}>{inr(computation.taxAfterRebate)}</Text>
          </View>
          <View style={letterStyles.tableRow}>
            <Text style={letterStyles.tableCellLabel}>Add: Health &amp; Education Cess @4%</Text>
            <Text style={letterStyles.tableCellValue}>{inr(computation.cess)}</Text>
          </View>
          <View style={letterStyles.tableRow}>
            <Text style={[letterStyles.tableCellLabel, { fontWeight: 700 }]}>Total Tax Payable (Computed)</Text>
            <Text style={[letterStyles.tableCellValue, { fontWeight: 700 }]}>{inr(computation.totalTax)}</Text>
          </View>
        </View>

        <Text style={letterStyles.sectionTitle}>Quarter-wise TDS Summary</Text>
        <View style={letterStyles.table}>
          <View style={letterStyles.tableRow}>
            <Text style={letterStyles.tableCellLabel} />
            <Text style={[letterStyles.tableCellValue, { fontWeight: 700 }]}>Gross Salary</Text>
            <Text style={[letterStyles.tableCellValue, { fontWeight: 700 }]}>TDS Deducted</Text>
          </View>
          {quarterlyBreakup.map((q) => (
            <View style={letterStyles.tableRow} key={q.quarter}>
              <Text style={letterStyles.tableCellLabel}>
                {q.label} ({q.monthsIncluded}/3 months finalized)
              </Text>
              <Text style={letterStyles.tableCellValue}>{inr(q.grossSalary)}</Text>
              <Text style={letterStyles.tableCellValue}>{inr(q.tdsDeducted)}</Text>
            </View>
          ))}
          <View style={letterStyles.tableRow}>
            <Text style={[letterStyles.tableCellLabel, { fontWeight: 700 }]}>Total (FY, Actual)</Text>
            <Text style={[letterStyles.tableCellValue, { fontWeight: 700 }]}>{inr(grossSalaryActual)}</Text>
            <Text style={[letterStyles.tableCellValue, { fontWeight: 700 }]}>{inr(totalTdsDeductedActual)}</Text>
          </View>
        </View>

        {showReconciliationNote && (
          <Text style={[letterStyles.paragraph, { fontSize: 9, color: "#475569" }]}>
            Note: the computed tax above and the TDS actually deducted month-to-month can legitimately
            differ — monthly TDS is estimated progressively at the time of each payroll run, not trued up
            precisely to the final annual figure until year-end.
          </Text>
        )}

        {monthsMissing.length > 0 && (
          <Text style={[letterStyles.paragraph, { fontSize: 9, color: "#b45309" }]}>
            Figures above only reflect finalized payroll runs. No finalized run was found for:{" "}
            {monthsMissing.map((m) => `${MONTH_NAMES[m.month - 1]} ${m.year}`).join(", ")}.
          </Text>
        )}

        {!hasTaxDeclaration && (
          <Text style={[letterStyles.paragraph, { fontSize: 9, color: "#b45309" }]}>
            No tax declaration was on file for this employee for {financialYear} — New Regime with zero
            additional deductions was assumed.
          </Text>
        )}

        <View style={letterStyles.signature}>
          <Text>For {orgName}</Text>
          <Text style={{ marginTop: 28 }}>Authorised Signatory</Text>
        </View>

        <Form16PartBDisclaimer orgName={orgName} />
        <Text style={letterStyles.footer}>Generated on {formatDate(generatedOn)}</Text>
      </Page>
    </Document>
  );
}
