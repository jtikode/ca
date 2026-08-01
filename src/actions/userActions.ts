"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertSession } from "@/lib/permissions";
import { hashPassword } from "@/lib/auth";

export interface InviteResult {
  ok: boolean;
  error?: string;
  tempPassword?: string;
}

function generateTempPassword(): string {
  return randomBytes(9).toString("base64url");
}

const inviteHrManagerSchema = z.object({
  name: z.string().min(1, "Name is required."),
  email: z.string().email("Enter a valid email."),
});

export async function inviteHrManager(_prevState: InviteResult | null, formData: FormData): Promise<InviteResult> {
  const session = await assertSession(["SUPERADMIN"]);

  const parsed = inviteHrManagerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { ok: false, error: "That email is already in use." };
  }

  const tempPassword = generateTempPassword();
  await db.user.create({
    data: {
      orgId: session.orgId,
      email: parsed.data.email,
      name: parsed.data.name,
      role: "HR_MANAGER",
      passwordHash: await hashPassword(tempPassword),
    },
  });

  revalidatePath("/team");
  return { ok: true, tempPassword };
}

const createEmployeeLoginSchema = z.object({
  email: z.string().email("Enter a valid email."),
});

export async function createEmployeeLogin(
  employeeId: string,
  _prevState: InviteResult | null,
  formData: FormData,
): Promise<InviteResult> {
  const session = await assertSession(["SUPERADMIN"]);

  const employee = await db.employee.findFirst({
    where: { id: employeeId, orgId: session.orgId },
    include: { loginUser: true },
  });
  if (!employee) {
    return { ok: false, error: "Employee not found." };
  }
  if (employee.loginUser) {
    return { ok: false, error: "This employee already has a login." };
  }

  const parsed = createEmployeeLoginSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const existingUser = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existingUser) {
    return { ok: false, error: "That email is already in use." };
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  await db.$transaction([
    db.employee.update({ where: { id: employeeId }, data: { email: parsed.data.email } }),
    db.user.create({
      data: {
        orgId: session.orgId,
        email: parsed.data.email,
        name: employee.name,
        role: "EMPLOYEE",
        employeeId,
        passwordHash,
      },
    }),
  ]);

  revalidatePath("/team");
  revalidatePath(`/employees/${employeeId}`);
  return { ok: true, tempPassword };
}
