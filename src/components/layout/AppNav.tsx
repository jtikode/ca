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
    { href: "/attendance", label: "Attendance" },
    { href: "/reports", label: "Reports" },
    { href: "/approvals", label: "Approvals" },
    { href: "/documents", label: "Documents" },
    { href: "/team", label: "Team" },
    { href: "/settings", label: "Settings" },
  ],
  HR_MANAGER: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/employees", label: "Employees" },
    { href: "/payroll", label: "Payroll" },
    { href: "/attendance", label: "Attendance" },
    { href: "/reports", label: "Reports" },
    { href: "/documents", label: "Documents" },
    { href: "/settings", label: "Settings" },
  ],
  EMPLOYEE: [
    { href: "/my-payslips", label: "My Payslips" },
    { href: "/my-documents", label: "My Documents" },
  ],
};

const ROLE_LABELS: Record<UserRole, string> = {
  SUPERADMIN: "Superadmin",
  HR_MANAGER: "HR Manager",
  EMPLOYEE: "Employee",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function AppNav({
  orgName,
  orgLogoUrl,
  userName,
  role,
}: {
  orgName: string;
  orgLogoUrl?: string | null;
  userName: string;
  role: UserRole;
}) {
  const pathname = usePathname();
  const links = LINKS[role];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-ink-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-base font-black text-slate-950 shadow-lg shadow-amber-500/20">
              T
            </div>
            <div>
              <div className="text-lg font-bold leading-none tracking-tight text-white">
                Tim<span className="text-amber-400">Hr</span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                {orgLogoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- external, admin-supplied URL
                  <img src={orgLogoUrl} alt="" className="h-3.5 w-3.5 rounded-sm object-contain" />
                )}
                {orgName}
              </div>
            </div>
          </div>
          <nav className="hidden items-center gap-4 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "text-sm font-medium transition-colors",
                  pathname.startsWith(link.href)
                    ? "text-amber-400"
                    : "text-slate-400 hover:text-white",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 rounded-full border border-slate-800 bg-slate-900/60 py-1 pl-1 pr-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-800 text-xs font-semibold text-amber-300 ring-1 ring-slate-700">
              {initials(userName)}
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-medium leading-tight text-white">{userName}</div>
              <div className="text-[11px] leading-tight text-slate-500">{ROLE_LABELS[role]}</div>
            </div>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="text-sm font-semibold text-slate-400 transition-colors hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
      <nav className="flex items-center gap-4 overflow-x-auto border-t border-slate-800/60 px-4 py-2 md:hidden">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={clsx(
              "whitespace-nowrap text-sm font-medium transition-colors",
              pathname.startsWith(link.href) ? "text-amber-400" : "text-slate-400 hover:text-white",
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
