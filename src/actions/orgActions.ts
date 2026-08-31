"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertSession } from "@/lib/permissions";
import { normalizeLogoUrl } from "@/lib/logoUrl";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function updateOrganization(_prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

  const legalName = (formData.get("legalName") as string) || null;
  const address = (formData.get("address") as string) || null;
  const pan = (formData.get("pan") as string) || null;
  const tan = (formData.get("tan") as string) || null;
  const pfRegistrationNo = (formData.get("pfRegistrationNo") as string) || null;
  const esiRegistrationNo = (formData.get("esiRegistrationNo") as string) || null;
  const pfApplicable = formData.get("pfApplicable") === "on";
  const esiApplicable = formData.get("esiApplicable") === "on";
  const payslipEmailEnabled = formData.get("payslipEmailEnabled") === "on";
  const logoUrlRaw = (formData.get("logoUrl") as string) || "";
  const logoUrl = logoUrlRaw ? normalizeLogoUrl(logoUrlRaw) : null;
  const overtimeAutoCalculateEnabled = formData.get("overtimeAutoCalculateEnabled") === "on";
  const standardHoursPerDay = Number(formData.get("standardHoursPerDay")) || 8;
  const overtimeRateMultiplier = Number(formData.get("overtimeRateMultiplier")) || 2;
  const multiLocationEnabled = formData.get("multiLocationEnabled") === "on";

  await db.organization.update({
    where: { id: session.orgId },
    data: {
      legalName,
      address,
      pan,
      tan,
      pfRegistrationNo,
      esiRegistrationNo,
      pfApplicable,
      esiApplicable,
      payslipEmailEnabled,
      logoUrl,
      overtimeAutoCalculateEnabled,
      standardHoursPerDay,
      overtimeRateMultiplier,
      multiLocationEnabled,
    },
  });

  revalidatePath("/settings");
  return { ok: true };
}
