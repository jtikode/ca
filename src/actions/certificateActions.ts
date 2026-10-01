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

  // An empty <input type="file"> still submits as a zero-byte File, not
  // null — normalize that to "no file" before validation so the upload
  // stays genuinely optional.
  const rawFile = formData.get("file");
  const file = rawFile instanceof File && rawFile.size > 0 ? rawFile : undefined;

  const parsed = addCertificateSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category") || undefined,
    expiryDate: formData.get("expiryDate"),
    file,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let fileData: Uint8Array<ArrayBuffer> | undefined;
  let fileMimeType: string | undefined;
  let fileName: string | undefined;
  if (parsed.data.file) {
    fileData = new Uint8Array(await parsed.data.file.arrayBuffer());
    fileMimeType = parsed.data.file.type;
    fileName = parsed.data.file.name;
  }

  await db.certificate.create({
    data: {
      orgId: session.orgId,
      name: parsed.data.name,
      category: parsed.data.category,
      expiryDate: parsed.data.expiryDate,
      fileData,
      fileMimeType,
      fileName,
    },
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
