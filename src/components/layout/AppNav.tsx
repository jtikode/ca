"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/actions/authActions";
import { clsx } from "@/lib/clsx";
import type { UserRole } from "@/generated/prisma/client";

const LINKS: Record<UserRole, { href: string; label: string }[]> = {
  SUPERADMIN: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/employees", label: "Employees" },
    { href: "/payroll", label: "Payroll" },
    { href: "/approvals", label: "Approvals" },
    { href: "/team", label: "Team" },
    { href: "/settings", label: "Settings" },
  ],
  HR_MANAGER: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/employees", label: "Employees" },
    { href: "/payroll", label: "Payroll" },
    { href: "/settings", label: "Settings" },
  ],
  EMPLOYEE: [{ href: "/my-payslips", label: "My Payslips" }],
};

export function AppNav({
  orgName,
  userName,
  role,
}: {
  orgName: string;
  userName: string;
  role: UserRole;
}) {
  const pathname = usePathname();
  const links = LINKS[role];

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="font-bold text-slate-900">{orgName}</span>
          <nav className="flex items-center gap-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "text-sm font-medium",
                  pathname.startsWith(link.href)
                    ? "text-blue-700"
                    : "text-slate-600 hover:text-slate-900",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600">{userName}</span>
          <form action={logout}>
            <button type="submit" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
