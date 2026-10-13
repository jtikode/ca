"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { assertSession } from "@/lib/permissions";
import { regularizationReviewSchema } from "@/lib/validators";
import { PROFILE_FIELDS, cleanProfileChanges, type ProfileField } from "@/lib/profileChanges";
import type { Prisma } from "@/generated/prisma/client";

export interface ActionResult {
  ok: boolean;
  error?: string;
  /** Echoed back on a validation error so the form can keep what was typed. */
  values?: Record<string, string>;
}

function currentValues(e: { email: string | null; dob: Date | null; pan: string | null; uan: string | null; bankAccountNo: string | null; bankIfsc: string | null }) {
  return {
    email: e.email ?? "",
    dob: e.dob ? e.dob.toISOString().slice(0, 10) : "",
    pan: e.pan ?? "",
    uan: e.uan ?? "",
    bankAccountNo: e.bankAccountNo ?? "",
    bankIfsc: e.bankIfsc ?? "",
  };
}

export async function submitProfileChange(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const session = await assertSession(["EMPLOYEE"]);
  if (!session.employeeId) return { ok: false, error: "No employee record linked to this login." };

  const employee = await db.employee.findFirst({ where: { id: session.employeeId, orgId: session.orgId } });
  if (!employee) return { ok: false, error: "Employee not found." };

  const pending = await db.profileChangeRequest.count({ where: { employeeId: employee.id, status: "PENDING" } });
  if (pending > 0) return { ok: false, error: "You already have a change waiting for HR. Wait for it to be reviewed." };

  const submitted: Partial<Record<ProfileField, string>> = {};
  for (const f of PROFILE_FIELDS) submitted[f] = String(formData.get(f) ?? "");

  const cleaned = cleanProfileChanges(submitted, currentValues(employee));
  if ("error" in cleaned) return { ok: false, error: cleaned.error, values: submitted as Record<string, string> };

  await db.profileChangeRequest.create({
    data: { orgId: session.orgId, employeeId: employee.id, changes: cleaned.changes as Prisma.InputJsonValue },
  });

  revalidatePath("/my-profile");
  revalidatePath("/profile-changes");
  return { ok: true };
}

export async function reviewProfileChange(
  requestId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

  const parsed = regularizationReviewSchema.safeParse({
    decision: formData.get("decision"),
    reviewNote: formData.get("reviewNote"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const request = await db.profileChangeRequest.findFirst({
    where: { id: requestId, orgId: session.orgId },
    include: { employee: true },
  });
  if (!request || request.status !== "PENDING") return { ok: false, error: "Request not found or already reviewed." };

  await db.$transaction(async (tx) => {
    if (parsed.data.decision === "APPROVED") {
      // Re-validated on approval: the stored JSON is never applied blindly.
      const stored = request.changes as Partial<Record<ProfileField, string>>;
      const cleaned = cleanProfileChanges(stored, {});
      if ("error" in cleaned) throw new Error(cleaned.error);
      const data: Prisma.EmployeeUpdateInput = {};
      for (const [field, value] of Object.entries(cleaned.changes) as [ProfileField, string][]) {
        if (field === "dob") data.dob = new Date(value);
        else data[field] = value;
      }
      await tx.employee.update({ where: { id: request.employeeId }, data });
    }
    await tx.profileChangeRequest.update({
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
    `PROFILE_CHANGE_${parsed.data.decision}`,
    "Employee",
    `${parsed.data.decision === "APPROVED" ? "Approved" : "Rejected"} a profile change for ${request.employee.name}`,
    request.employeeId,
  );

  revalidatePath("/profile-changes");
  revalidatePath("/my-profile");
  return { ok: true };
}
