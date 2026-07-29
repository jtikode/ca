import { getIronSession, type IronSession } from "iron-session";
import { cookies } from "next/headers";
import type { UserRole } from "@/generated/prisma/client";

export interface SessionData {
  userId?: string;
  orgId?: string;
  role?: UserRole;
  name?: string;
}

const sessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: "payroll_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
