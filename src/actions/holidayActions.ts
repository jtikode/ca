"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { assertSession } from "@/lib/permissions";
import { holidaySchema } from "@/lib/validators";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function addHoliday(_prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

  const parsed = holidaySchema.safeParse({ date: formData.get("date"), name: formData.get("name") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const existing = await db.holiday.findUnique({
    where: { orgId_date: { orgId: session.orgId, date: parsed.data.date } },
  });
  if (existing) return { ok: false, error: "A holiday is already set for that date." };

  await db.holiday.create({ data: { orgId: session.orgId, date: parsed.data.date, name: parsed.data.name } });
  await recordAudit(
    session,
    "HOLIDAY_ADDED",
    "Holiday",
    `Added holiday "${parsed.data.name}" on ${parsed.data.date.toLocaleDateString("en-IN")}`,
  );

  revalidatePath("/holidays");
  revalidatePath("/my-leaves");
  return { ok: true };
}

export async function deleteHoliday(holidayId: string): Promise<void> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);
  await db.holiday.deleteMany({ where: { id: holidayId, orgId: session.orgId } });
  await recordAudit(session, "HOLIDAY_DELETED", "Holiday", "Deleted a holiday", holidayId);
  revalidatePath("/holidays");
  revalidatePath("/my-leaves");
}
