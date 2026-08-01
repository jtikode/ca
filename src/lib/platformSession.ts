import { getIronSession, type IronSession } from "iron-session";
import { cookies } from "next/headers";

export interface PlatformSessionData {
  platformAdminId?: string;
  name?: string;
}

// Deliberately a separate cookie name AND a separate secret from the tenant
// session (src/lib/session.ts) — a bug that mixed up the two session types
// cannot let a tenant session decode as a platform session, or vice versa,
// because the seal itself is keyed differently.
const platformSessionOptions = {
  password: process.env.PLATFORM_SESSION_SECRET as string,
  cookieName: "platform_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
  },
};

export async function getPlatformSession(): Promise<IronSession<PlatformSessionData>> {
  const cookieStore = await cookies();
  return getIronSession<PlatformSessionData>(cookieStore, platformSessionOptions);
}
