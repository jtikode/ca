"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertSession } from "@/lib/permissions";
import { addDocumentSchema } from "@/lib/validators";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function addDocument(_prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

  const parsed = addDocumentSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    url: formData.get("url"),
    employeeIds: formData.getAll("employeeIds"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  // Only connect employees that actually belong to this org — formData is
  // client-supplied, so re-scope rather than trusting the posted ids as-is.
  const employees = await db.employee.findMany({
    where: { id: { in: parsed.data.employeeIds }, orgId: session.orgId },
    select: { id: true },
  });

  await db.companyDocument.create({
    data: {
      orgId: session.orgId,
      title: parsed.data.title,
      category: parsed.data.category,
      url: parsed.data.url,
      visibleTo: { connect: employees.map((e) => ({ id: e.id })) },
    },
  });

  revalidatePath("/documents");
  return { ok: true };
}

export async function deleteDocument(documentId: string): Promise<void> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

  await db.companyDocument.deleteMany({ where: { id: documentId, orgId: session.orgId } });

  revalidatePath("/documents");
}
