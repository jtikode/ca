import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { AppNav } from "@/components/layout/AppNav";
import { listAccessibleOrgs } from "@/lib/clients";
import { daysUntil } from "@/lib/dates";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const organization = await db.organization.findUniqueOrThrow({ where: { id: session.orgId } });
  const orgs = session.role === "EMPLOYEE" ? [] : await listAccessibleOrgs(session.userId);
  const pilotDaysLeft = organization.trialEndsAt ? daysUntil(organization.trialEndsAt) : null;

  return (
    <div className="flex flex-1 flex-col">
      <AppNav
        orgName={organization.name}
        orgLogoUrl={organization.logoUrl}
        userName={session.name}
        role={session.role}
        orgs={orgs.length > 1 ? orgs.map((o) => ({ id: o.id, name: o.name })) : undefined}
        currentOrgId={session.orgId}
      />
      {pilotDaysLeft !== null && session.role !== "EMPLOYEE" && (
        <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center text-sm font-medium text-amber-400">
          {pilotDaysLeft > 0
            ? `Your free pilot has ${pilotDaysLeft} day${pilotDaysLeft === 1 ? "" : "s"} left.`
            : "Your 7 day free pilot has ended. Contact us to keep using TimHr."}{" "}
          <a href="mailto:app.jptk@gmail.com" className="underline">
            Talk to us
          </a>
        </div>
      )}
      <div className="app-backdrop flex-1">
        <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
      </div>
    </div>
  );
}
