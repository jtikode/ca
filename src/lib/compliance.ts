import { db } from "@/lib/db";
import { daysUntil } from "@/lib/dates";

// Statutory headcount thresholds above which registration is generally
// mandatory. EPF: Employees' Provident Funds Act, 1952 (20+ employees).
// ESI: Employees' State Insurance Act, 1948, as amended (10+ employees in
// most implementing areas — a minority of areas still use 20). These are
// defaults for a warning, not a legal determination — see the disclaimer
// shown alongside every gap.
export const PF_MANDATORY_HEADCOUNT = 20;
export const ESI_MANDATORY_HEADCOUNT = 10;

// Certificates expiring within this many days are surfaced as a gap
// alongside the dashboard's own Certificate Expiry card, so the weekly
// digest email carries the same warning even if nobody opens the app.
const CERTIFICATE_WARNING_WINDOW_DAYS = 30;

export interface ComplianceGap {
  key: string;
  title: string;
  detail: string;
  severity: "warning" | "danger";
  /** Slug of the matching affiliated service on timhr.in, for the
   * dashboard's "talk to someone" link and the digest email. */
  serviceSlug: string;
}

/** Headcount-threshold and certificate-expiry gaps only — this app has no
 * turnover/revenue data, so GST registration applicability (which turns on
 * turnover, not headcount) can't be auto-detected here. That check lives in
 * the public registration-check tool on timhr.in instead, where the
 * business owner supplies turnover themselves. */
export async function detectComplianceGaps(orgId: string): Promise<ComplianceGap[]> {
  const [org, activeHeadcount, certificates] = await Promise.all([
    db.organization.findUniqueOrThrow({ where: { id: orgId } }),
    db.employee.count({ where: { orgId, status: "ACTIVE" } }),
    db.certificate.findMany({ where: { orgId } }),
  ]);

  const gaps: ComplianceGap[] = [];

  if (activeHeadcount >= PF_MANDATORY_HEADCOUNT && (!org.pfApplicable || !org.pfRegistrationNo)) {
    gaps.push({
      key: "pf-threshold",
      title: "PF registration may now be mandatory",
      detail: `You have ${activeHeadcount} active employees. PF (EPF) registration is generally mandatory once an establishment crosses ${PF_MANDATORY_HEADCOUNT} employees, and ${
        !org.pfRegistrationNo ? "no PF registration number is on file" : "PF is currently marked not applicable"
      } for this company.`,
      severity: "danger",
      serviceSlug: "labour-law-compliance",
    });
  }

  if (activeHeadcount >= ESI_MANDATORY_HEADCOUNT && (!org.esiApplicable || !org.esiRegistrationNo)) {
    gaps.push({
      key: "esi-threshold",
      title: "ESI registration may now be mandatory",
      detail: `You have ${activeHeadcount} active employees. ESI registration is generally mandatory once an establishment crosses ${ESI_MANDATORY_HEADCOUNT} employees in most states, and ${
        !org.esiRegistrationNo ? "no ESI registration number is on file" : "ESI is currently marked not applicable"
      } for this company.`,
      severity: "danger",
      serviceSlug: "labour-law-compliance",
    });
  }

  for (const cert of certificates) {
    const remaining = daysUntil(cert.expiryDate);
    if (remaining > CERTIFICATE_WARNING_WINDOW_DAYS) continue;
    gaps.push({
      key: `certificate-${cert.id}`,
      title: remaining <= 0 ? `${cert.name} has expired` : `${cert.name} expires soon`,
      detail:
        remaining <= 0
          ? `This expired on ${cert.expiryDate.toLocaleDateString("en-IN")}. Renew it to avoid being caught without a valid certificate at an inspection.`
          : `This expires on ${cert.expiryDate.toLocaleDateString("en-IN")}, in ${remaining} day${remaining === 1 ? "" : "s"}.`,
      severity: remaining <= 7 ? "danger" : "warning",
      serviceSlug: "company-law-compliance",
    });
  }

  return gaps;
}
