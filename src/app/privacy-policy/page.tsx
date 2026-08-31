import Link from "next/link";
import { Card } from "@/components/ui/Card";

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 py-10">
      <div>
        <Link href="/login" className="text-sm font-semibold text-amber-400 hover:underline">
          ← Back
        </Link>
      </div>

      <Card>
        <h1 className="mb-2 text-2xl font-bold text-white">Privacy Policy</h1>
        <p className="mb-6 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
          This is a template privacy policy, not legal advice. Have it reviewed by a lawyer before
          relying on it as your company&apos;s actual privacy policy.
        </p>

        <div className="space-y-5 text-sm leading-relaxed text-slate-300">
          <section>
            <h2 className="mb-1 text-base font-bold text-white">1. What we collect</h2>
            <p>
              To run payroll and generate the documents this app produces, we collect and store: employee
              personal details (name, date of birth, gender, contact details), identity and statutory
              numbers (PAN, UAN, ESIC IP number, MLWF ID, bank account and IFSC), salary structure and
              payroll history, attendance records, tax declarations, and your company&apos;s own
              registration details (PAN, TAN, PF/ESI registration numbers, address).
            </p>
          </section>

          <section>
            <h2 className="mb-1 text-base font-bold text-white">2. Why we collect it</h2>
            <p>
              Solely to compute payroll, statutory deductions (PF, ESI, Professional Tax, TDS), and
              generate the payslips, HR letters, and compliance reports this app is designed to produce
              for your company and its employees.
            </p>
          </section>

          <section>
            <h2 className="mb-1 text-base font-bold text-white">3. How it&apos;s stored</h2>
            <p>
              Data is stored in a managed database, scoped strictly to your company account — no company
              using this app can access another company&apos;s data. Access within your company is
              controlled by the role each user is assigned (Superadmin, HR Manager, or Employee
              self-service).
            </p>
          </section>

          <section>
            <h2 className="mb-1 text-base font-bold text-white">4. Sharing</h2>
            <p>
              We do not sell employee or company data to third parties. Data is only used to provide this
              service to you. If your company enables features that send email (such as payslip
              delivery), the relevant data is transmitted only to the intended recipient.
            </p>
          </section>

          <section>
            <h2 className="mb-1 text-base font-bold text-white">5. Retention</h2>
            <p>
              Data is retained for as long as your company account is active, plus any period required to
              comply with applicable statutory record-keeping requirements. You may request deletion of
              your account&apos;s data, subject to any legal retention obligations that apply to payroll
              and tax records.
            </p>
          </section>

          <section>
            <h2 className="mb-1 text-base font-bold text-white">6. Your rights</h2>
            <p>
              Employees and companies using this app may request access to, correction of, or deletion of
              their personal data by contacting their company&apos;s administrator, who can reach us at{" "}
              <span className="font-medium">[support email — add here]</span>.
            </p>
          </section>

          <section>
            <h2 className="mb-1 text-base font-bold text-white">7. Changes to this policy</h2>
            <p>
              This policy may be updated from time to time. Continued use of the app after an update
              constitutes acceptance of the revised policy.
            </p>
          </section>
        </div>
      </Card>
    </div>
  );
}
