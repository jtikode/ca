import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import type { UserRole } from "@/generated/prisma/client";

/** For use inside Server Actions: throws instead of redirecting. */
export async function assertSession(allowed?: UserRole[]) {
  const session = await getSession();

  if (!session.userId || !session.orgId || !session.role) {
    throw new Error("Not authorized.");
  }

  if (allowed && !allowed.includes(session.role)) {
    throw new Error("Not authorized.");
  }

  return session as Required<typeof session>;
}

/** For use inside Server Components/pages: redirects to /login instead of throwing. */
export async function requireSession(allowed?: UserRole[]) {
  const session = await getSession();

  if (!session.userId || !session.orgId || !session.role) {
    redirect("/login");
  }

  if (allowed && !allowed.includes(session.role)) {
    redirect("/dashboard");
  }

  return session as Required<typeof session>;
}
