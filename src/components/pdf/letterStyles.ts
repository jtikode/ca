import { StyleSheet } from "@react-pdf/renderer";

export const letterStyles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", lineHeight: 1.5 },
  header: { marginBottom: 20, borderBottom: 1, borderColor: "#cbd5e1", paddingBottom: 12 },
  logo: { width: 90, height: 36, objectFit: "contain", marginBottom: 6 },
  orgName: { fontSize: 16, fontWeight: 700 },
  orgAddress: { fontSize: 9, color: "#475569", marginTop: 2 },
  title: { fontSize: 13, fontWeight: 700, marginTop: 12, marginBottom: 12 },
  date: { fontSize: 9, color: "#475569", marginBottom: 12 },
  paragraph: { marginBottom: 10 },
  section: { marginBottom: 12 },
  sectionTitle: { fontWeight: 700, marginBottom: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  label: { color: "#475569" },
  value: { fontWeight: 700 },
  table: { marginTop: 4, borderTop: 1, borderColor: "#e2e8f0" },
  tableRow: { flexDirection: "row", borderBottom: 1, borderColor: "#e2e8f0", paddingVertical: 4 },
  tableCellLabel: { flex: 1, color: "#475569" },
  tableCellValue: { width: 100, textAlign: "right" },
  signature: { marginTop: 36 },
  footer: { marginTop: 32, fontSize: 8, color: "#94a3b8" },
});

export function formatDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export function inr(n: number): string {
  return `Rs. ${n.toLocaleString("en-IN")}`;
}
