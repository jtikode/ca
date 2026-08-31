import { Document, Page, Text, View, Image } from "@react-pdf/renderer";
import { letterStyles, formatDate } from "@/components/pdf/letterStyles";
import { DisclaimerFooter } from "@/components/pdf/DisclaimerFooter";

export function ExperienceLetterDocument({
  orgName,
  orgLogoUrl,
  orgAddress,
  employeeName,
  employeeCode,
  designation,
  doj,
  dol,
  employmentBasis,
  employeeCategory,
}: {
  orgName: string;
  orgLogoUrl?: string | null;
  orgAddress: string;
  employeeName: string;
  employeeCode: string;
  designation: string;
  doj: Date;
  dol: Date;
  employmentBasis: "PERMANENT" | "CONTRACT";
  employeeCategory: "MANAGERIAL" | "NON_MANAGERIAL";
}) {
  return (
    <Document>
      <Page size="A4" style={letterStyles.page}>
        <View style={letterStyles.header}>
          {orgLogoUrl && <Image src={orgLogoUrl} style={letterStyles.logo} />}
          <Text style={letterStyles.orgName}>{orgName}</Text>
          <Text style={letterStyles.orgAddress}>{orgAddress}</Text>
        </View>

        <Text style={letterStyles.date}>Date: {formatDate(new Date())}</Text>
        <Text style={letterStyles.title}>To Whomsoever It May Concern</Text>

        <Text style={letterStyles.paragraph}>
          This is to certify that {employeeName} (Employee Code: {employeeCode}) was employed with{" "}
          {orgName} as {designation} from {formatDate(doj)} to {formatDate(dol)}.
        </Text>
        <Text style={letterStyles.paragraph}>
          During this tenure, they were engaged on a {employmentBasis === "CONTRACT" ? "contract" : "permanent"}{" "}
          basis in a {employeeCategory === "MANAGERIAL" ? "managerial" : "non-managerial"} capacity, and we
          found their conduct and performance to be satisfactory.
        </Text>
        <Text style={letterStyles.paragraph}>We wish them success in all future endeavors.</Text>

        <View style={letterStyles.signature}>
          <Text>For {orgName}</Text>
          <Text style={{ marginTop: 28 }}>Authorized Signatory</Text>
        </View>

        <DisclaimerFooter orgName={orgName} />
      </Page>
    </Document>
  );
}
