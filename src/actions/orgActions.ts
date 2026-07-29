"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertSession } from "@/lib/permissions";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function updateOrganization(_prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const session = await assertSession(["OWNER", "ADMIN"]);

  const legalName = (formData.get("legalName") as string) || null;
  const pan = (formData.get("pan") as string) || null;
  const tan = (formData.get("tan") as string) || null;
  const pfRegistrationNo = (formData.get("pfRegistrationNo") as string) || null;
  const esiRegistrationNo = (formData.get("esiRegistrationNo") as string) || null;
  const pfApplicable = formData.get("pfApplicable") === "on";
  const esiApplicable = formData.get("esiApplicable") === "on";

  await db.organization.update({
    where: { id: session.orgId },
    data: { legalName, pan, tan, pfRegistrationNo, esiRegistrationNo, pfApplicable, esiApplicable },
  });

  revalidatePath("/settings");
  return { ok: true };
}
