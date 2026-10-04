"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { assertSession } from "@/lib/permissions";
import { regularizationSchema, regularizationReviewSchema } from "@/lib/validators";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function submitRegularization(_prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const session = await assertSession(["EMPLOYEE"]);
  if (!session.employeeId) return { ok: false, error: "No employee record linked to this login." };

  const parsed = regularizationSchema.safeParse({
    date: formData.get("date"),
    status: formData.get("status"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  if (parsed.data.date.getTime() > Date.now()) return { ok: false, error: "You can't regularize a future date." };

  await db.attendanceRegularization.create({
    data: {
      orgId: session.orgId,
      employeeId: session.employeeId,
      date: parsed.data.date,
      markPresent: parsed.data.status === "PRESENT",
      reason: parsed.data.reason,
    },
  });

  revalidatePath("/my-attendance");
  revalidatePath("/regularizations");
  return { ok: true };
}

// Approving writes the day into Attendance (the same table the biometric
// import fills), so a corrected day actually changes attendance based pay.
export async function reviewRegularization(
  requestId: string,
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

  const parsed = regularizationReviewSchema.safeParse({
    decision: formData.get("decision"),
    reviewNote: formData.get("reviewNote"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const request = await db.attendanceRegularization.findFirst({ where: { id: requestId, orgId: session.orgId } });
  if (!request || request.status !== "PENDING") return { ok: false, error: "Request not found or already reviewed." };

  await db.$transaction(async (tx) => {
    if (parsed.data.decision === "APPROVED") {
      await tx.attendance.upsert({
        where: { employeeId_date: { employeeId: request.employeeId, date: request.date } },
        create: {
          orgId: session.orgId,
          employeeId: request.employeeId,
          date: request.date,
          present: request.markPresent,
        },
        update: { present: request.markPresent },
      });
    }
    await tx.attendanceRegularization.update({
      where: { id: requestId },
      data: {
        status: parsed.data.decision,
        reviewNote: parsed.data.reviewNote,
        reviewedById: session.userId,
        reviewedAt: new Date(),
      },
    });
  });

  await recordAudit(
    session,
    `REGULARIZATION_${parsed.data.decision}`,
    "AttendanceRegularization",
    `${parsed.data.decision === "APPROVED" ? "Approved" : "Rejected"} an attendance correction for ${request.date.toLocaleDateString("en-IN")}`,
    requestId,
  );

  revalidatePath("/regularizations");
  revalidatePath("/my-attendance");
  return { ok: true };
}
