import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { MONTH_NAMES } from "@/lib/dates";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  header: { marginBottom: 16, borderBottom: 1, borderColor: "#cbd5e1", paddingBottom: 12 },
  orgName: { fontSize: 16, fontWeight: 700 },
  title: { fontSize: 12, marginTop: 4, color: "#475569" },
  section: { marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  label: { color: "#475569" },
  value: { fontWeight: 700 },
  table: { marginTop: 8, borderTop: 1, borderColor: "#e2e8f0" },
  tableRow: { flexDirection: "row", borderBottom: 1, borderColor: "#e2e8f0", paddingVertical: 4 },
  tableCellLabel: { flex: 1, color: "#475569" },
  tableCellValue: { width: 80, textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, paddingTop: 6, borderTop: 1, borderColor: "#0f172a" },
  totalLabel: { fontSize: 12, fontWeight: 700 },
  totalValue: { fontSize: 12, fontWeight: 700 },
  footer: { marginTop: 24, fontSize: 8, color: "#94a3b8" },
});

function inr(n: number) {
  return `Rs. ${n.toLocaleString("en-IN")}`;
}

export function PayslipDocument({
  orgName,
  employeeName,
  employeeCode,
  month,
  year,
  earnings,
  grossEarnings,
  pfEmployee,
  esiEmployee,
  ptAmount,
  tdsAmount,
  netPay,
  daysPaid,
  daysInMonth,
}: {
  orgName: string;
  employeeName: string;
  employeeCode: string;
  month: number;
  year: number;
  earnings: { basic: number; hra: number; conveyance: number; medicalAllowance: number; specialAllowance: number };
  grossEarnings: number;
  pfEmployee: number;
  esiEmployee: number;
  ptAmount: number;
  tdsAmount: number;
  netPay: number;
  daysPaid: number;
  daysInMonth: number;
}) {
  const totalDeductions = pfEmployee + esiEmployee + ptAmount + tdsAmount;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.orgName}>{orgName}</Text>
          <Text style={styles.title}>
            Payslip — {MONTH_NAMES[month - 1]} {year}
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Employee</Text>
            <Text style={styles.value}>
              {employeeName} ({employeeCode})
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Days paid</Text>
            <Text style={styles.value}>
              {daysPaid} / {daysInMonth}
            </Text>
          </View>
        </View>

        <Text style={{ fontWeight: 700, marginBottom: 4 }}>Earnings</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Basic</Text>
            <Text style={styles.tableCellValue}>{inr(earnings.basic)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>HRA</Text>
            <Text style={styles.tableCellValue}>{inr(earnings.hra)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Conveyance</Text>
            <Text style={styles.tableCellValue}>{inr(earnings.conveyance)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Special allowance</Text>
            <Text style={styles.tableCellValue}>{inr(earnings.specialAllowance)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCellLabel, { fontWeight: 700 }]}>Gross earnings</Text>
            <Text style={[styles.tableCellValue, { fontWeight: 700 }]}>{inr(grossEarnings)}</Text>
          </View>
        </View>

        <Text style={{ fontWeight: 700, marginTop: 12, marginBottom: 4 }}>Deductions</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>PF (employee)</Text>
            <Text style={styles.tableCellValue}>{inr(pfEmployee)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>ESI (employee)</Text>
            <Text style={styles.tableCellValue}>{inr(esiEmployee)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Professional Tax</Text>
            <Text style={styles.tableCellValue}>{inr(ptAmount)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>TDS</Text>
            <Text style={styles.tableCellValue}>{inr(tdsAmount)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCellLabel, { fontWeight: 700 }]}>Total deductions</Text>
            <Text style={[styles.tableCellValue, { fontWeight: 700 }]}>{inr(totalDeductions)}</Text>
          </View>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Net pay</Text>
          <Text style={styles.totalValue}>{inr(netPay)}</Text>
        </View>

        <Text style={styles.footer}>
          This is a system-generated payslip. Figures are computed estimates — please have your accountant verify
          statutory deductions before filing.
        </Text>
      </Page>
    </Document>
  );
}
