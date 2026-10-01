import { db } from "@/lib/db";
import { sendMail } from "@/lib/email";
import { detectComplianceGaps } from "@/lib/compliance";
import { upcomingStatutoryDeadlines } from "@/lib/dates";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const SERVICES_BASE_URL = "https://timhr.in/services";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Builds and sends one org's weekly compliance digest to every SUPERADMIN
 * on the account. Does not check complianceDigestEnabled or timing itself —
 * that's the sweep's job (runComplianceDigestSweep below) — so this can
 * also be called directly for a one-off "send now" if that's ever wired up. */
export async function sendComplianceDigestForOrg(orgId: string): Promise<{ sent: boolean; reason?: string }> {
  const [org, admins, gaps] = await Promise.all([
    db.organization.findUniqueOrThrow({ where: { id: orgId } }),
    db.user.findMany({ where: { orgId, role: "SUPERADMIN" }, select: { email: true, name: true } }),
    detectComplianceGaps(orgId),
  ]);

  if (admins.length === 0) return { sent: false, reason: "No SUPERADMIN account with an email on file." };

  const deadlines = upcomingStatutoryDeadlines().filter((d) => d.daysRemaining <= 14);
  if (gaps.length === 0 && deadlines.length === 0) {
    // Still worth marking as "checked" so the sweep doesn't retry daily.
    await db.organization.update({ where: { id: orgId }, data: { lastComplianceDigestSentAt: new Date() } });
    return { sent: false, reason: "Nothing to report this week." };
  }

  const gapRows = gaps
    .map(
      (g) => `
      <li style="margin-bottom:12px;">
        <b>${escapeHtml(g.title)}</b><br/>
        <span style="color:#555;">${escapeHtml(g.detail)}</span><br/>
        <a href="${SERVICES_BASE_URL}/${g.serviceSlug}">Talk to someone about this</a>
      </li>`,
    )
    .join("");

  const deadlineRows = deadlines
    .map(
      (d) =>
        `<li>${escapeHtml(d.title)} — due ${d.dueDate.toLocaleDateString("en-IN")} (${
          d.daysRemaining <= 0 ? "due today or overdue" : `${d.daysRemaining} day${d.daysRemaining === 1 ? "" : "s"} left`
        })</li>`,
    )
    .join("");

  const html = `
    <h2>Weekly compliance check for ${escapeHtml(org.name)}</h2>
    ${gaps.length > 0 ? `<h3>Flagged gaps</h3><ul>${gapRows}</ul>` : ""}
    ${deadlines.length > 0 ? `<h3>Due within 14 days</h3><ul>${deadlineRows}</ul>` : ""}
    <p style="color:#888;font-size:12px;">
      This is an automated weekly summary from TimHr. Figures and flags are computed estimates —
      confirm applicability and amounts with your CA before acting. You can turn this email off in Settings.
    </p>
  `;

  for (const admin of admins) {
    try {
      await sendMail({
        to: admin.email,
        subject: `Weekly compliance check: ${gaps.length} flagged for ${org.name}`,
        html,
      });
    } catch (err) {
      console.error(`Failed to send compliance digest to ${admin.email}`, err);
    }
  }

  await db.organization.update({ where: { id: orgId }, data: { lastComplianceDigestSentAt: new Date() } });
  return { sent: true };
}

/** Finds every org that has opted in and is due (never sent, or sent 7+
 * days ago) and sends their digest. Safe to call repeatedly — orgs not yet
 * due are simply skipped, so this can run on an hourly timer without
 * double-sending. */
export async function runComplianceDigestSweep(): Promise<{ checked: number; sent: number }> {
  const cutoff = new Date(Date.now() - SEVEN_DAYS_MS);
  const dueOrgs = await db.organization.findMany({
    where: {
      complianceDigestEnabled: true,
      OR: [{ lastComplianceDigestSentAt: null }, { lastComplianceDigestSentAt: { lt: cutoff } }],
    },
    select: { id: true },
  });

  let sent = 0;
  for (const org of dueOrgs) {
    const result = await sendComplianceDigestForOrg(org.id);
    if (result.sent) sent += 1;
  }
  return { checked: dueOrgs.length, sent };
}
