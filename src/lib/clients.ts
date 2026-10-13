import { db } from "@/lib/db";
import type { UserRole } from "@/generated/prisma/client";

export interface AccessibleOrg {
  id: string;
  name: string;
  role: UserRole;
  isHome: boolean;
}

/** Every company this login can open: its own, plus any client company it
 * was given a membership in. Employee logins never have memberships. */
export async function listAccessibleOrgs(userId: string): Promise<AccessibleOrg[]> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      organization: { select: { id: true, name: true } },
      memberships: { select: { role: true, organization: { select: { id: true, name: true } } } },
    },
  });
  if (!user) return [];

  const orgs: AccessibleOrg[] = [
    { id: user.organization.id, name: user.organization.name, role: user.role, isHome: true },
  ];
  for (const m of user.memberships) {
    if (m.organization.id === user.organization.id) continue;
    orgs.push({ id: m.organization.id, name: m.organization.name, role: m.role, isHome: false });
  }
  return orgs.sort((a, b) => Number(b.isHome) - Number(a.isHome) || a.name.localeCompare(b.name));
}
