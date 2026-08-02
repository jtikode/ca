"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertSession } from "@/lib/permissions";
import { leavePolicySchema } from "@/lib/validators";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function updateLeavePolicy(_prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

  const parsed = leavePolicySchema.safeParse({
    casualLeavePerYear: formData.get("casualLeavePerYear"),
    sickLeavePerYear: formData.get("sickLeavePerYear"),
    earnedLeavePerYear: formData.get("earnedLeavePerYear"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const org = await db.organization.findUniqueOrThrow({ where: { id: session.orgId } });

  await db.leavePolicy.upsert({
    where: { orgId: session.orgId },
    create: { orgId: session.orgId, state: org.state, ...parsed.data },
    update: parsed.data,
  });

  revalidatePath("/settings");
  return { ok: true };
}
