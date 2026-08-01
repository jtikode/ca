"use server";

import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getPlatformSession } from "@/lib/platformSession";
import { assertPlatformSession } from "@/lib/platformPermissions";
import { hashPassword, verifyPassword } from "@/lib/auth";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface CreateOrgResult extends ActionResult {
  tempPassword?: string;
}

function generateTempPassword(): string {
  return randomBytes(9).toString("base64url");
}

const platformLoginSchema = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(1, "Password is required."),
});

export async function platformLogin(_prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = platformLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const admin = await db.platformAdmin.findUnique({ where: { email: parsed.data.email } });
  if (!admin || !(await verifyPassword(parsed.data.password, admin.passwordHash))) {
    return { ok: false, error: "Invalid email or password." };
  }

  const session = await getPlatformSession();
  session.platformAdminId = admin.id;
  session.name = admin.name;
  await session.save();

  redirect("/platform/organizations");
}

export async function platformLogout(): Promise<void> {
  const session = await getPlatformSession();
  session.destroy();
  redirect("/platform/login");
}

const createOrganizationSchema = z.object({
  orgName: z.string().min(2, "Company name is required."),
  state: z.string().min(1, "State is required."),
  ownerName: z.string().min(1, "Owner name is required."),
  ownerEmail: z.string().email("Enter a valid email."),
});

export async function createOrganization(
  _prevState: CreateOrgResult | null,
  formData: FormData,
): Promise<CreateOrgResult> {
  const admin = await assertPlatformSession();

  const parsed = createOrganizationSchema.safeParse({
    orgName: formData.get("orgName"),
    state: formData.get("state"),
    ownerName: formData.get("ownerName"),
    ownerEmail: formData.get("ownerEmail"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const existing = await db.user.findUnique({ where: { email: parsed.data.ownerEmail } });
  if (existing) {
    return { ok: false, error: "A user with that email already exists." };
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  await db.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: parsed.data.orgName,
        state: parsed.data.state,
        createdByPlatformAdminId: admin.platformAdminId,
      },
    });

    await tx.user.create({
      data: {
        orgId: organization.id,
        email: parsed.data.ownerEmail,
        name: parsed.data.ownerName,
        role: "SUPERADMIN",
        passwordHash,
      },
    });
  });

  revalidatePath("/platform/organizations");
  return { ok: true, tempPassword };
}
