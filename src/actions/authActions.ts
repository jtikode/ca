"use server";

import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { sendMail } from "@/lib/email";
import { signupSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "@/lib/validators";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function signup(_prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = signupSchema.safeParse({
    orgName: formData.get("orgName"),
    state: formData.get("state"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { ok: false, error: "An account with that email already exists." };
  }

  const { user } = await db.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name: parsed.data.orgName, state: parsed.data.state },
    });

    const user = await tx.user.create({
      data: {
        orgId: organization.id,
        email: parsed.data.email,
        passwordHash: await hashPassword(parsed.data.password),
        name: parsed.data.name,
        role: "SUPERADMIN",
      },
    });

    return { organization, user };
  });

  const session = await getSession();
  session.userId = user.id;
  session.orgId = user.orgId;
  session.role = user.role;
  session.name = user.name;
  await session.save();

  redirect("/dashboard");
}

export async function login(_prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { ok: false, error: "Invalid email or password." };
  }

  const session = await getSession();
  session.userId = user.id;
  session.orgId = user.orgId;
  session.role = user.role;
  session.name = user.name;
  session.employeeId = user.employeeId ?? undefined;
  await session.save();

  redirect(user.role === "EMPLOYEE" ? "/my-payslips" : "/dashboard");
}

export async function logout(): Promise<void> {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Always returns ok:true regardless of whether the email exists — an
 * account-enumeration guard, not an error-hiding shortcut. Only a real
 * account actually gets an email. */
export async function requestPasswordReset(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (user) {
    const token = randomBytes(32).toString("hex");
    await db.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
    });

    const host = (await headers()).get("host") ?? "app.timhr.in";
    const proto = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
    const resetUrl = `${proto}://${host}/reset-password?token=${token}`;

    try {
      await sendMail({
        to: user.email,
        subject: "Reset your TimHr password",
        html: `<p>Hi ${user.name},</p><p>Click the link below to reset your TimHr password. This link expires in 1 hour and can only be used once.</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, you can safely ignore this email.</p>`,
      });
    } catch (err) {
      console.error(`Failed to send password reset email to ${user.email}`, err);
    }
  }

  return { ok: true };
}

export async function resetPassword(_prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const resetToken = await db.passwordResetToken.findUnique({ where: { token: parsed.data.token } });
  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return { ok: false, error: "This reset link is invalid or has expired. Request a new one." };
  }

  await db.$transaction([
    db.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash: await hashPassword(parsed.data.password) },
    }),
    db.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
  ]);

  redirect("/login?reset=success");
}
