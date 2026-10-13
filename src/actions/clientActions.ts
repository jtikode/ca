"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { assertSession } from "@/lib/permissions";
import { recordAudit } from "@/lib/audit";
import { listAccessibleOrgs } from "@/lib/clients";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

// Switching only rewrites the session's org and role; access is re-checked
// against the user's own org and memberships on every switch, so the posted
// orgId is never trusted on its own.
export async function switchOrganization(formData: FormData): Promise<void> {
  const current = await assertSession(["SUPERADMIN", "HR_MANAGER"]);
  const orgId = String(formData.get("orgId") ?? "");

  const orgs = await listAccessibleOrgs(current.userId);
  const target = orgs.find((o) => o.id === orgId);
  if (!target) return;

  const session = await getSession();
  session.orgId = target.id;
  session.role = target.role;
  await session.save();

  // Company name and switcher sit in the shared layout, refresh them too.
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function createClientOrganization(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await assertSession(["SUPERADMIN"]);

  const name = String(formData.get("name") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  if (name.length < 2) return { ok: false, error: "Enter the client company name." };
  if (!state) return { ok: false, error: "Select the state." };

  const org = await db.$transaction(async (tx) => {
    const created = await tx.organization.create({ data: { name, state } });
    await tx.orgMembership.create({ data: { userId: session.userId, orgId: created.id, role: "SUPERADMIN" } });
    return created;
  });

  await recordAudit(session, "CLIENT_CREATED", "Organization", `Added client company "${org.name}"`, org.id);
  // The company switcher lives in the shared layout, so refresh it too.
  revalidatePath("/", "layout");
  redirect("/clients?added=1");
}
