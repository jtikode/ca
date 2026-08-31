import { Document, Page, Text, View, Image } from "@react-pdf/renderer";
import { letterStyles, formatDate, inr } from "@/components/pdf/letterStyles";
import { DisclaimerFooter } from "@/components/pdf/DisclaimerFooter";

export function OfferLetterDocument({
  orgName,
  orgLogoUrl,
  orgAddress,
  employeeName,
  designation,
  doj,
  ctcAnnual,
  employmentBasis,
  employmentStage,
}: {
  orgName: string;
  orgLogoUrl?: string | null;
  orgAddress: string;
  employeeName: string;
  designation: string;
  doj: Date;
  ctcAnnual: number;
  employmentBasis: "PERMANENT" | "CONTRACT";
  employmentStage: "PROBATION" | "CONFIRMED";
}) {
  const basisLabel = employmentBasis === "CONTRACT" ? "contract" : "permanent";

  return (
    <Document>
      <Page size="A4" style={letterStyles.page}>
        <View style={letterStyles.header}>
          {orgLogoUrl && <Image src={orgLogoUrl} style={letterStyles.logo} />}
          <Text style={letterStyles.orgName}>{orgName}</Text>
          <Text style={letterStyles.orgAddress}>{orgAddress}</Text>
        </View>

        <Text style={letterStyles.date}>Date: {formatDate(new Date())}</Text>
        <Text style={letterStyles.title}>Offer of Employment</Text>

        <Text style={letterStyles.paragraph}>Dear {employeeName},</Text>
        <Text style={letterStyles.paragraph}>
          We are pleased to offer you employment with {orgName} for the position of {designation},
          effective from {formatDate(doj)}. Your employment will be on a {basisLabel} basis
          {employmentStage === "PROBATION"
            ? ", subject to a probation period as per company policy."
            : "."}
        </Text>
        <Text style={letterStyles.paragraph}>
          Your annual Cost to Company (CTC) will be approximately {inr(ctcAnnual)}, subject to
          statutory deductions and the detailed breakup in your appointment letter.
        </Text>
        <Text style={letterStyles.paragraph}>
          This offer is subject to the terms and conditions of your appointment letter, standard
          company policies, and applicable law. Please sign and return a copy of this letter to
          confirm your acceptance.
        </Text>
        <Text style={letterStyles.paragraph}>We look forward to welcoming you to the team.</Text>

        <View style={letterStyles.signature}>
          <Text>For {orgName}</Text>
          <Text style={{ marginTop: 28 }}>Authorized Signatory</Text>
        </View>

        <DisclaimerFooter orgName={orgName} />
      </Page>
    </Document>
  );
}
