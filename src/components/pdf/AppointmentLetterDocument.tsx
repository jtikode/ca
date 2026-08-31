import { Document, Page, Text, View, Image } from "@react-pdf/renderer";
import { letterStyles, formatDate, inr } from "@/components/pdf/letterStyles";
import { DisclaimerFooter } from "@/components/pdf/DisclaimerFooter";

export function AppointmentLetterDocument({
  orgName,
  orgLogoUrl,
  orgAddress,
  employeeName,
  employeeCode,
  designation,
  doj,
  employmentBasis,
  employmentStage,
  probationEndDate,
  employeeCategory,
  earnings,
  grossMonthly,
  pfApplicable,
  esiApplicable,
  ptApplicable,
  leavePolicy,
  pfEmployeeMonthly,
  pfEmployerMonthly,
  esiEmployeeMonthly,
  esiEmployerMonthly,
}: {
  orgName: string;
  orgLogoUrl?: string | null;
  orgAddress: string;
  employeeName: string;
  employeeCode: string;
  designation: string;
  doj: Date;
  employmentBasis: "PERMANENT" | "CONTRACT";
  employmentStage: "PROBATION" | "CONFIRMED";
  probationEndDate: Date | null;
  employeeCategory: "MANAGERIAL" | "NON_MANAGERIAL";
  earnings: {
    basic: number;
    hra: number;
    da?: number;
    conveyance: number;
    medicalAllowance: number;
    specialAllowance: number;
    otherAllowances?: { name: string; amount: number; basis: "FIXED" | "ATTENDANCE" }[];
  };
  grossMonthly: number;
  pfApplicable: boolean;
  esiApplicable: boolean;
  ptApplicable: boolean;
  leavePolicy: { casualLeavePerYear: number; sickLeavePerYear: number; earnedLeavePerYear: number } | null;
  // Monthly rupee figures; annual (×12) is derived at render time. Always
  // read-only, computed server-side from the same statutory.ts functions
  // used in real payroll — never a separately-editable "print-only" number.
  pfEmployeeMonthly: number;
  pfEmployerMonthly: number;
  esiEmployeeMonthly: number;
  esiEmployerMonthly: number;
}) {
  const totalLeave = leavePolicy
    ? leavePolicy.casualLeavePerYear + leavePolicy.sickLeavePerYear + leavePolicy.earnedLeavePerYear
    : null;

  return (
    <Document>
      <Page size="A4" style={letterStyles.page}>
        <View style={letterStyles.header}>
          {orgLogoUrl && <Image src={orgLogoUrl} style={letterStyles.logo} />}
          <Text style={letterStyles.orgName}>{orgName}</Text>
          <Text style={letterStyles.orgAddress}>{orgAddress}</Text>
        </View>

        <Text style={letterStyles.date}>Date: {formatDate(new Date())}</Text>
        <Text style={letterStyles.title}>Letter of Appointment</Text>

        <Text style={letterStyles.paragraph}>
          Dear {employeeName} (Employee Code: {employeeCode}),
        </Text>
        <Text style={letterStyles.paragraph}>
          Further to our discussions, we are pleased to confirm your appointment with {orgName} as{" "}
          {designation}, effective {formatDate(doj)}.
        </Text>

        <Text style={letterStyles.sectionTitle}>Employment terms</Text>
        <View style={letterStyles.section}>
          <View style={letterStyles.row}>
            <Text style={letterStyles.label}>Employment basis</Text>
            <Text style={letterStyles.value}>{employmentBasis === "CONTRACT" ? "Contract" : "Permanent"}</Text>
          </View>
          <View style={letterStyles.row}>
            <Text style={letterStyles.label}>Employment stage</Text>
            <Text style={letterStyles.value}>
              {employmentStage === "PROBATION"
                ? `Probation${probationEndDate ? ` until ${formatDate(probationEndDate)}` : ""}`
                : "Confirmed"}
            </Text>
          </View>
          <View style={letterStyles.row}>
            <Text style={letterStyles.label}>Category</Text>
            <Text style={letterStyles.value}>
              {employeeCategory === "MANAGERIAL" ? "Managerial" : "Non-managerial"}
            </Text>
          </View>
        </View>

        <Text style={letterStyles.sectionTitle}>Compensation (monthly)</Text>
        <View style={letterStyles.table}>
          <View style={letterStyles.tableRow}>
            <Text style={letterStyles.tableCellLabel}>Basic</Text>
            <Text style={letterStyles.tableCellValue}>{inr(earnings.basic)}</Text>
          </View>
          <View style={letterStyles.tableRow}>
            <Text style={letterStyles.tableCellLabel}>HRA</Text>
            <Text style={letterStyles.tableCellValue}>{inr(earnings.hra)}</Text>
          </View>
          {(earnings.da ?? 0) > 0 && (
            <View style={letterStyles.tableRow}>
              <Text style={letterStyles.tableCellLabel}>DA</Text>
              <Text style={letterStyles.tableCellValue}>{inr(earnings.da ?? 0)}</Text>
            </View>
          )}
          <View style={letterStyles.tableRow}>
            <Text style={letterStyles.tableCellLabel}>Conveyance</Text>
            <Text style={letterStyles.tableCellValue}>{inr(earnings.conveyance)}</Text>
          </View>
          <View style={letterStyles.tableRow}>
            <Text style={letterStyles.tableCellLabel}>Special allowance</Text>
            <Text style={letterStyles.tableCellValue}>{inr(earnings.specialAllowance)}</Text>
          </View>
          {(earnings.otherAllowances ?? []).map((item, i) => (
            <View style={letterStyles.tableRow} key={`${item.name}-${i}`}>
              <Text style={letterStyles.tableCellLabel}>{item.name}</Text>
              <Text style={letterStyles.tableCellValue}>{inr(item.amount)}</Text>
            </View>
          ))}
          <View style={letterStyles.tableRow}>
            <Text style={[letterStyles.tableCellLabel, { fontWeight: 700 }]}>Gross (monthly)</Text>
            <Text style={[letterStyles.tableCellValue, { fontWeight: 700 }]}>{inr(grossMonthly)}</Text>
          </View>
        </View>

        <Text style={[letterStyles.sectionTitle, { marginTop: 12 }]}>Statutory deductions</Text>
        <View style={letterStyles.section}>
          <View style={letterStyles.row}>
            <Text style={letterStyles.label}>Provident Fund (PF)</Text>
            <Text style={letterStyles.value}>{pfApplicable ? "Applicable" : "Not applicable"}</Text>
          </View>
          <View style={letterStyles.row}>
            <Text style={letterStyles.label}>ESI</Text>
            <Text style={letterStyles.value}>{esiApplicable ? "Applicable" : "Not applicable"}</Text>
          </View>
          <View style={letterStyles.row}>
            <Text style={letterStyles.label}>Professional Tax</Text>
            <Text style={letterStyles.value}>{ptApplicable ? "Applicable" : "Not applicable"}</Text>
          </View>
        </View>

        {(pfApplicable || esiApplicable) && (
          <>
            <Text style={letterStyles.sectionTitle}>Statutory contributions (auto-calculated)</Text>
            <View style={letterStyles.table}>
              <View style={letterStyles.tableRow}>
                <Text style={letterStyles.tableCellLabel} />
                <Text style={[letterStyles.tableCellValue, { fontWeight: 700 }]}>Monthly</Text>
                <Text style={[letterStyles.tableCellValue, { fontWeight: 700 }]}>Annual</Text>
              </View>
              {pfApplicable && (
                <>
                  <View style={letterStyles.tableRow}>
                    <Text style={letterStyles.tableCellLabel}>PF (employee)</Text>
                    <Text style={letterStyles.tableCellValue}>{inr(pfEmployeeMonthly)}</Text>
                    <Text style={letterStyles.tableCellValue}>{inr(pfEmployeeMonthly * 12)}</Text>
                  </View>
                  <View style={letterStyles.tableRow}>
                    <Text style={letterStyles.tableCellLabel}>PF (employer)</Text>
                    <Text style={letterStyles.tableCellValue}>{inr(pfEmployerMonthly)}</Text>
                    <Text style={letterStyles.tableCellValue}>{inr(pfEmployerMonthly * 12)}</Text>
                  </View>
                </>
              )}
              {esiApplicable && (
                <>
                  <View style={letterStyles.tableRow}>
                    <Text style={letterStyles.tableCellLabel}>ESI (employee)</Text>
                    <Text style={letterStyles.tableCellValue}>{inr(esiEmployeeMonthly)}</Text>
                    <Text style={letterStyles.tableCellValue}>{inr(esiEmployeeMonthly * 12)}</Text>
                  </View>
                  <View style={letterStyles.tableRow}>
                    <Text style={letterStyles.tableCellLabel}>ESI (employer)</Text>
                    <Text style={letterStyles.tableCellValue}>{inr(esiEmployerMonthly)}</Text>
                    <Text style={letterStyles.tableCellValue}>{inr(esiEmployerMonthly * 12)}</Text>
                  </View>
                </>
              )}
            </View>
          </>
        )}

        <Text style={letterStyles.sectionTitle}>Leave entitlement (indicative, per applicable state law)</Text>
        <View style={letterStyles.section}>
          {leavePolicy ? (
            <>
              <View style={letterStyles.row}>
                <Text style={letterStyles.label}>Casual leave</Text>
                <Text style={letterStyles.value}>{leavePolicy.casualLeavePerYear} days/year</Text>
              </View>
              <View style={letterStyles.row}>
                <Text style={letterStyles.label}>Sick leave</Text>
                <Text style={letterStyles.value}>{leavePolicy.sickLeavePerYear} days/year</Text>
              </View>
              <View style={letterStyles.row}>
                <Text style={letterStyles.label}>Earned leave</Text>
                <Text style={letterStyles.value}>{leavePolicy.earnedLeavePerYear} days/year</Text>
              </View>
              <View style={letterStyles.row}>
                <Text style={[letterStyles.label, { fontWeight: 700 }]}>Total</Text>
                <Text style={[letterStyles.value]}>{totalLeave} days/year</Text>
              </View>
            </>
          ) : (
            <Text style={letterStyles.label}>No leave policy configured for this state.</Text>
          )}
        </View>

        <Text style={letterStyles.paragraph}>
          Your employment is further subject to the company&apos;s standard code of conduct,
          confidentiality obligations, and notice period as per company policy. Please sign and
          return a copy of this letter to acknowledge acceptance.
        </Text>

        <View style={letterStyles.signature}>
          <Text>For {orgName}</Text>
          <Text style={{ marginTop: 28 }}>Authorized Signatory</Text>
        </View>

        <DisclaimerFooter
          orgName={orgName}
          extraLine="Salary structure is subject to change from time to time as per applicable laws and change in laws after discussion with employee in writing."
        />
      </Page>
    </Document>
  );
}
