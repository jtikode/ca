import { redirect } from "next/navigation";
import { getPlatformSession } from "@/lib/platformSession";

/** For use inside Server Components/pages: redirects to /platform/login. */
export async function requirePlatformSession() {
  const session = await getPlatformSession();

  if (!session.platformAdminId) {
    redirect("/platform/login");
  }

  return session as Required<typeof session>;
}

/** For use inside Server Actions: throws instead of redirecting. */
export async function assertPlatformSession() {
  const session = await getPlatformSession();

  if (!session.platformAdminId) {
    throw new Error("Not authorized.");
  }

  return session as Required<typeof session>;
}
