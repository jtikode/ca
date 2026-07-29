"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { signupSchema, loginSchema } from "@/lib/validators";

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
        role: "OWNER",
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
  await session.save();

  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
