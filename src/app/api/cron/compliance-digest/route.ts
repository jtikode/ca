import { NextResponse } from "next/server";
import { runComplianceDigestSweep } from "@/lib/complianceDigest";

// The in-process scheduler in instrumentation.ts already runs this sweep
// hourly as a best-effort default, but a long-running Node process can
// restart or stall. This endpoint lets an external trigger (a Hostinger
// cron job, or a free service like cron-job.org hitting it weekly) run the
// same sweep reliably — it's a no-op for any org not yet due, so it's safe
// to call more often than weekly.
export async function GET(request: Request) {
  const providedSecret = new URL(request.url).searchParams.get("secret");
  if (!process.env.CRON_SECRET || providedSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runComplianceDigestSweep();
  return NextResponse.json(result);
}
