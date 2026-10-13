"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { assertSession } from "@/lib/permissions";
import { buildSettlement, parseSettlementInput } from "@/lib/settlement";
import type { Prisma } from "@/generated/prisma/client";

// Recomputes from the submitted inputs on the server (never trusts a figure
// sent by the browser), then records it, sets the employee's date of leaving
// so the experience and relieving letters unlock, and cancels any loan that
// was recovered here so no further EMI is generated.
export async function recordSettlement(formData: FormData): Promise<void> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

  const input = parseSettlementInput((k) => formData.get(k) as string | null);
  if (!input) return;
  const result = await buildSettlement(session.orgId, input);
  if (!result) return;

  await db.$transaction(async (tx) => {
    await tx.finalSettlement.create({
      data: {
        orgId: session.orgId,
        employeeId: result.employee.id,
        lastWorkingDay: input.lastWorkingDay,
        breakdown: result as unknown as Prisma.InputJsonValue,
        netPayable: result.net,
      },
    });
    await tx.employee.update({ where: { id: result.employee.id }, data: { dol: input.lastWorkingDay } });
    if (result.loanIdsRecovered.length > 0) {
      await tx.loan.updateMany({
        where: { id: { in: result.loanIdsRecovered }, orgId: session.orgId },
        data: { status: "CANCELLED" },
      });
    }
  });

  await recordAudit(
    session,
    "SETTLEMENT_RECORDED",
    "Employee",
    `Recorded full and final settlement for ${result.employee.name}, net ${result.net}`,
    result.employee.id,
  );

  revalidatePath("/settlements");
  redirect("/settlements?saved=1");
}
