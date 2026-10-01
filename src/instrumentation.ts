// Best-effort in-process fallback for the weekly compliance digest
// (src/lib/complianceDigest.ts): once per server start, and then every
// hour, check which orgs are due and send theirs. This only works while a
// single Node process stays alive continuously — a restart just means the
// next tick picks up where the "due since" check left off, so nothing is
// lost, but a process that restarts often will send late. For a more
// reliable schedule, point an external cron (e.g. a Hostinger cron job) at
// GET /api/cron/compliance-digest?secret=CRON_SECRET instead; this
// in-process timer is a fallback, not a replacement for that.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const ONE_HOUR_MS = 60 * 60 * 1000;

  const { runComplianceDigestSweep } = await import("@/lib/complianceDigest");

  const tick = async () => {
    try {
      const result = await runComplianceDigestSweep();
      if (result.sent > 0) {
        console.log(`Compliance digest sweep: ${result.sent}/${result.checked} org(s) sent.`);
      }
    } catch (err) {
      console.error("Compliance digest sweep failed", err);
    }
  };

  void tick();
  setInterval(tick, ONE_HOUR_MS);
}
