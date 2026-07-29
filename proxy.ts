import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Cookie-presence check only — this is a UX redirect, not the security
// boundary. Every Server Action and Server Component still calls
// requireSession()/assertSession() from src/lib/permissions.ts, which is
// what actually enforces auth and org scoping.
const PUBLIC_PATHS = ["/login", "/signup"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has("payroll_session");

  if (!hasSession && !PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (hasSession && PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
