import { Document, Page, Text, View } from "@react-pdf/renderer";
import { letterStyles, formatDate } from "@/components/pdf/letterStyles";
import { DisclaimerFooter } from "@/components/pdf/DisclaimerFooter";

export function RelievingLetterDocument({
  orgName,
  orgAddress,
  employeeName,
  employeeCode,
  designation,
  dol,
}: {
  orgName: string;
  orgAddress: string;
  employeeName: string;
  employeeCode: string;
  designation: string;
  dol: Date;
}) {
  return (
    <Document>
      <Page size="A4" style={letterStyles.page}>
        <View style={letterStyles.header}>
          <Text style={letterStyles.orgName}>{orgName}</Text>
          <Text style={letterStyles.orgAddress}>{orgAddress}</Text>
        </View>

        <Text style={letterStyles.date}>Date: {formatDate(new Date())}</Text>
        <Text style={letterStyles.title}>Relieving Letter</Text>

        <Text style={letterStyles.paragraph}>
          Dear {employeeName} (Employee Code: {employeeCode}),
        </Text>
        <Text style={letterStyles.paragraph}>
          This is to confirm that you have been relieved from your duties as {designation} at{" "}
          {orgName} with effect from {formatDate(dol)}, pursuant to your resignation/separation.
        </Text>
        <Text style={letterStyles.paragraph}>
          All dues, if any, are subject to final settlement as per company policy.
        </Text>
        <Text style={letterStyles.paragraph}>
          We thank you for your contributions during your tenure and wish you the very best in your
          future endeavors.
        </Text>

        <View style={letterStyles.signature}>
          <Text>For {orgName}</Text>
          <Text style={{ marginTop: 28 }}>Authorized Signatory</Text>
        </View>

        <DisclaimerFooter orgName={orgName} />
      </Page>
    </Document>
  );
}
