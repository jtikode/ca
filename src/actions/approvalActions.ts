"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertSession } from "@/lib/permissions";
import type { OtherAllowanceItem } from "@/lib/statutory";
import type { Prisma } from "@/generated/prisma/client";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

interface CreateEmployeePayload {
  employeeCode: string;
  name: string;
  doj: string;
  dob: string | null;
  gender?: string;
  pan?: string;
  uan?: string;
  esiNumber?: string;
  mlwfIdNumber?: string;
  bankAccountNo?: string;
  bankIfsc?: string;
  state: string;
  pfApplicable: boolean;
  esiApplicable: boolean;
  basic: number;
  hra: number;
  da: number;
  conveyance: number;
  medicalAllowance: number;
  specialAllowance: number;
  otherAllowances?: OtherAllowanceItem[];
}

interface UpdateSalaryPayload {
  employeeId: string;
  basic: number;
  hra: number;
  da: number;
  conveyance: number;
  medicalAllowance: number;
  specialAllowance: number;
  otherAllowances?: OtherAllowanceItem[];
}

// Applies the request's stored payload, then marks it approved — both inside
// one transaction so a request can never end up APPROVED without its change
// actually having landed.
export async function approveRequest(requestId: string): Promise<ActionResult> {
  const session = await assertSession(["SUPERADMIN"]);

  const request = await db.approvalRequest.findFirst({
    where: { id: requestId, orgId: session.orgId, status: "PENDING" },
  });
  if (!request) {
    return { ok: false, error: "Request not found or already reviewed." };
  }

  await db.$transaction(async (tx) => {
    if (request.type === "CREATE_EMPLOYEE") {
      const p = request.payload as unknown as CreateEmployeePayload;
      const { basic, hra, da, conveyance, medicalAllowance, specialAllowance, otherAllowances, doj, dob, ...rest } =
        p;

      await tx.employee.create({
        data: {
          orgId: session.orgId,
          ...rest,
          doj: new Date(doj),
          dob: dob ? new Date(dob) : null,
          salaryStructures: {
            create: {
              effectiveFrom: new Date(doj),
              basic,
              hra,
              da,
              conveyance,
              medicalAllowance,
              specialAllowance,
              otherAllowances: otherAllowances as unknown as Prisma.InputJsonValue,
            },
          },
        },
      });
    } else if (request.type === "UPDATE_SALARY") {
      const p = request.payload as unknown as UpdateSalaryPayload;
      const { employeeId, otherAllowances, ...salary } = p;

      await tx.salaryStructure.create({
        data: {
          employeeId,
          effectiveFrom: new Date(),
          ...salary,
          otherAllowances: otherAllowances as unknown as Prisma.InputJsonValue,
        },
      });
    }

    await tx.approvalRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED", reviewedById: session.userId, reviewedAt: new Date() },
    });
  });

  revalidatePath("/approvals");
  revalidatePath("/employees");
  return { ok: true };
}

export async function rejectRequest(requestId: string, reviewNote?: string): Promise<ActionResult> {
  const session = await assertSession(["SUPERADMIN"]);

  const request = await db.approvalRequest.findFirst({
    where: { id: requestId, orgId: session.orgId, status: "PENDING" },
  });
  if (!request) {
    return { ok: false, error: "Request not found or already reviewed." };
  }

  await db.approvalRequest.update({
    where: { id: requestId },
    data: { status: "REJECTED", reviewedById: session.userId, reviewedAt: new Date(), reviewNote },
  });

  revalidatePath("/approvals");
  return { ok: true };
}
