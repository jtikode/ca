"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertSession } from "@/lib/permissions";
import { addCertificateSchema } from "@/lib/validators";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function addCertificate(_prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

  const parsed = addCertificateSchema.safeParse({
    name: formData.get("name"),
    expiryDate: formData.get("expiryDate"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db.certificate.create({
    data: { orgId: session.orgId, name: parsed.data.name, expiryDate: parsed.data.expiryDate },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteCertificate(certificateId: string): Promise<void> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

  await db.certificate.deleteMany({ where: { id: certificateId, orgId: session.orgId } });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}
