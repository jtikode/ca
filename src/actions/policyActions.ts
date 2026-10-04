"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertSession } from "@/lib/permissions";

export async function acknowledgePolicy(documentId: string): Promise<void> {
  const session = await assertSession(["EMPLOYEE"]);
  if (!session.employeeId) return;

  // Only a POLICY document actually shared with this employee can be acknowledged.
  const doc = await db.companyDocument.findFirst({
    where: {
      id: documentId,
      orgId: session.orgId,
      category: "POLICY",
      visibleTo: { some: { id: session.employeeId } },
    },
    select: { id: true },
  });
  if (!doc) return;

  await db.policyAcknowledgement.upsert({
    where: { documentId_employeeId: { documentId, employeeId: session.employeeId } },
    create: { documentId, employeeId: session.employeeId },
    update: {},
  });

  revalidatePath("/my-documents");
  revalidatePath("/documents");
}
