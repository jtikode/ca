import Link from "next/link";
import { requirePlatformSession } from "@/lib/platformPermissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";

export default async function OrganizationsPage() {
  await requirePlatformSession();

  const organizations = await db.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { employees: true, users: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Companies</h1>
        <Link
          href="/platform/organizations/new"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-amber-500 px-4 text-sm font-semibold text-slate-950 shadow-[0_0_20px_-6px_rgba(245,158,11,0.5)] transition hover:bg-amber-400"
        >
          New company
        </Link>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="py-2 pr-4">Company</th>
              <th className="py-2 pr-4">State</th>
              <th className="py-2 pr-4">Employees</th>
              <th className="py-2 pr-4">Logins</th>
              <th className="py-2 pr-4">Created</th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((org) => (
              <tr key={org.id} className="border-b border-slate-800">
                <td className="py-2 pr-4 font-medium text-white">{org.name}</td>
                <td className="py-2 pr-4 text-slate-400">{org.state}</td>
                <td className="py-2 pr-4 text-slate-400">{org._count.employees}</td>
                <td className="py-2 pr-4 text-slate-400">{org._count.users}</td>
                <td className="py-2 pr-4 text-slate-400">{org.createdAt.toLocaleDateString("en-IN")}</td>
              </tr>
            ))}
            {organizations.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-slate-400">
                  No companies yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
