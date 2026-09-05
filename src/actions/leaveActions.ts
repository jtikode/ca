"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertSession } from "@/lib/permissions";
import { leaveRequestSchema, leaveReviewSchema } from "@/lib/validators";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function submitLeaveRequest(_prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const session = await assertSession(["EMPLOYEE"]);
  if (!session.employeeId) return { ok: false, error: "No employee record linked to this login." };

  const parsed = leaveRequestSchema.safeParse({
    type: formData.get("type"),
    fromDate: formData.get("fromDate"),
    toDate: formData.get("toDate"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const days = Math.round((parsed.data.toDate.getTime() - parsed.data.fromDate.getTime()) / MS_PER_DAY) + 1;

  await db.leaveRequest.create({
    data: {
      orgId: session.orgId,
      employeeId: session.employeeId,
      type: parsed.data.type,
      fromDate: parsed.data.fromDate,
      toDate: parsed.data.toDate,
      reason: parsed.data.reason,
      days,
    },
  });

  revalidatePath("/my-leaves");
  revalidatePath("/leaves");
  return { ok: true };
}

export async function reviewLeaveRequest(
  requestId: string,
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

  const parsed = leaveReviewSchema.safeParse({
    decision: formData.get("decision"),
    reviewNote: formData.get("reviewNote"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const request = await db.leaveRequest.findFirst({ where: { id: requestId, orgId: session.orgId } });
  if (!request || request.status !== "PENDING") return { ok: false, error: "Request not found or already reviewed." };

  await db.leaveRequest.update({
    where: { id: requestId },
    data: {
      status: parsed.data.decision,
      reviewNote: parsed.data.reviewNote,
      reviewedById: session.userId,
      reviewedAt: new Date(),
    },
  });

  revalidatePath("/leaves");
  revalidatePath("/my-leaves");
  return { ok: true };
}
