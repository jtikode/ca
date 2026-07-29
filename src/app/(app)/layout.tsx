import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { AppNav } from "@/components/layout/AppNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const organization = await db.organization.findUniqueOrThrow({ where: { id: session.orgId } });

  return (
    <div className="flex flex-1 flex-col">
      <AppNav orgName={organization.name} userName={session.name} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
