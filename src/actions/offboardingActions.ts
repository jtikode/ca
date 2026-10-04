"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { assertSession } from "@/lib/permissions";
import { DEFAULT_OFFBOARDING_ITEMS } from "@/lib/validators";

export async function startOffboarding(formData: FormData): Promise<void> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

  const employeeId = String(formData.get("employeeId") ?? "");
  const employee = await db.employee.findFirst({ where: { id: employeeId, orgId: session.orgId } });
  if (!employee) return;

  const existing = await db.offboardingItem.count({ where: { orgId: session.orgId, employeeId } });
  if (existing > 0) return;

  await db.offboardingItem.createMany({
    data: DEFAULT_OFFBOARDING_ITEMS.map((title) => ({ orgId: session.orgId, employeeId, title })),
  });
  await recordAudit(session, "OFFBOARDING_STARTED", "Employee", `Started offboarding for ${employee.name}`, employeeId);

  revalidatePath("/offboarding");
}

export async function toggleOffboardingItem(itemId: string, done: boolean): Promise<void> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

  await db.offboardingItem.updateMany({
    where: { id: itemId, orgId: session.orgId },
    data: { done, doneAt: done ? new Date() : null },
  });

  revalidatePath("/offboarding");
}

export async function clearOffboarding(employeeId: string): Promise<void> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);
  await db.offboardingItem.deleteMany({ where: { orgId: session.orgId, employeeId } });
  await recordAudit(session, "OFFBOARDING_CLEARED", "Employee", "Removed an offboarding checklist", employeeId);
  revalidatePath("/offboarding");
}
