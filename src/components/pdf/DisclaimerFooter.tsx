import { Text } from "@react-pdf/renderer";
import { letterStyles } from "@/components/pdf/letterStyles";

export function DisclaimerFooter({ orgName }: { orgName: string }) {
  return (
    <Text style={letterStyles.footer}>
      This is a system-generated, indicative document. {orgName} is responsible for reviewing it for
      legal accuracy and compliance with applicable law before issuing. This tool and its provider
      assume no liability for its content or legal validity.
    </Text>
  );
}
