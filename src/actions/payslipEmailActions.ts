"use server";

import { assertSession } from "@/lib/permissions";
import { buildPayslipPdfBuffer } from "@/lib/payslipPdf";
import { sendMail } from "@/lib/email";
import { MONTH_NAMES } from "@/lib/dates";

export interface SendPayslipResult {
  ok: boolean;
  error?: string;
  sentTo?: string;
}

/** Core send logic, no session check — used both by the manual action below
 * and by finalizePayrollRun's automatic-send loop (payrollActions.ts), which
 * has already authorized the caller once for the whole run. */
export async function sendPayslipEmailInternal(
  payrollRunId: string,
  employeeId: string,
  orgId: string,
): Promise<SendPayslipResult> {
  const result = await buildPayslipPdfBuffer(payrollRunId, employeeId, orgId);
  if (!result) return { ok: false, error: "Payslip not found." };
  if (!result.employeeEmail) return { ok: false, error: "This employee has no email on file." };

  try {
    await sendMail({
      to: result.employeeEmail,
      subject: `Payslip — ${MONTH_NAMES[result.month - 1]} ${result.year}`,
      html: `<p>Dear ${result.employeeName},</p><p>Please find attached your payslip for ${MONTH_NAMES[result.month - 1]} ${result.year}.</p>`,
      attachments: [
        { filename: `payslip-${result.employeeCode}-${result.month}-${result.year}.pdf`, content: result.buffer },
      ],
    });
  } catch (err) {
    console.error(`Failed to send payslip email to ${result.employeeEmail}`, err);
    return { ok: false, error: "Could not send email — check the SMTP configuration and try again." };
  }

  return { ok: true, sentTo: result.employeeEmail };
}

/** Manual, on-demand send — always available regardless of the org's
 * payslipEmailEnabled toggle (that toggle only gates the automatic send on
 * finalize, see finalizePayrollRun in payrollActions.ts). */
export async function sendPayslipEmail(payrollRunId: string, employeeId: string): Promise<SendPayslipResult> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);
  return sendPayslipEmailInternal(payrollRunId, employeeId, session.orgId);
}
