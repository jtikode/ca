"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { assertSession } from "@/lib/permissions";
import { assetSchema } from "@/lib/validators";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function addAsset(_prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

  const parsed = assetSchema.safeParse({ name: formData.get("name"), serialNo: formData.get("serialNo") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const asset = await db.asset.create({ data: { orgId: session.orgId, ...parsed.data } });
  await recordAudit(session, "ASSET_ADDED", "Asset", `Added asset "${asset.name}"`, asset.id);

  revalidatePath("/assets");
  return { ok: true };
}

export async function assignAsset(assetId: string, formData: FormData): Promise<void> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

  const employeeId = String(formData.get("employeeId") ?? "");
  const [asset, employee] = await Promise.all([
    db.asset.findFirst({ where: { id: assetId, orgId: session.orgId } }),
    db.employee.findFirst({ where: { id: employeeId, orgId: session.orgId } }),
  ]);
  if (!asset || !employee) return;

  await db.asset.update({ where: { id: assetId }, data: { assignedToId: employee.id, assignedAt: new Date() } });
  await recordAudit(session, "ASSET_ASSIGNED", "Asset", `Assigned "${asset.name}" to ${employee.name}`, assetId);

  revalidatePath("/assets");
  revalidatePath("/offboarding");
}

export async function returnAsset(assetId: string): Promise<void> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

  const asset = await db.asset.findFirst({
    where: { id: assetId, orgId: session.orgId },
    include: { assignedTo: true },
  });
  if (!asset) return;

  await db.asset.update({ where: { id: assetId }, data: { assignedToId: null, assignedAt: null } });
  await recordAudit(
    session,
    "ASSET_RETURNED",
    "Asset",
    `Marked "${asset.name}" returned${asset.assignedTo ? ` by ${asset.assignedTo.name}` : ""}`,
    assetId,
  );

  revalidatePath("/assets");
  revalidatePath("/offboarding");
}

export async function deleteAsset(assetId: string): Promise<void> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);
  const asset = await db.asset.findFirst({ where: { id: assetId, orgId: session.orgId } });
  if (!asset) return;
  await db.asset.delete({ where: { id: assetId } });
  await recordAudit(session, "ASSET_DELETED", "Asset", `Deleted asset "${asset.name}"`, assetId);
  revalidatePath("/assets");
}
