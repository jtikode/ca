import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { InviteHrManagerForm } from "@/components/team/InviteHrManagerForm";
import { CreateEmployeeLoginForm } from "@/components/team/CreateEmployeeLoginForm";

const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: "Super Admin",
  HR_MANAGER: "HR Manager",
  EMPLOYEE: "Employee",
};

export default async function TeamPage() {
  const session = await requireSession(["SUPERADMIN"]);

  const org = await db.organization.findUniqueOrThrow({
    where: { id: session.orgId },
    select: { multiLocationEnabled: true },
  });
  const [users, employeesWithoutLogin, stores] = await Promise.all([
    db.user.findMany({
      where: { orgId: session.orgId },
      orderBy: { createdAt: "asc" },
      include: { employee: { select: { name: true, employeeCode: true } }, store: { select: { name: true } } },
    }),
    db.employee.findMany({
      where: { orgId: session.orgId, status: "ACTIVE", loginUser: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, employeeCode: true },
    }),
    org.multiLocationEnabled
      ? db.store.findMany({ where: { orgId: session.orgId }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Team</h1>

      <Card>
        <h2 className="mb-4 text-lg font-bold text-white">Invite an HR manager</h2>
        <InviteHrManagerForm multiLocationEnabled={org.multiLocationEnabled} stores={stores} />
      </Card>

      <Card>
        <h2 className="mb-1 text-lg font-bold text-white">Create an employee login</h2>
        <p className="mb-4 text-sm text-slate-400">
          Gives an employee self-service access to their own profile and payslips.
        </p>
        <CreateEmployeeLoginForm employees={employeesWithoutLogin} />
      </Card>

      <Card className="overflow-x-auto">
        <h2 className="mb-4 text-lg font-bold text-white">All logins</h2>
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Role</th>
              {org.multiLocationEnabled && <th className="py-2 pr-4">Store</th>}
              <th className="py-2 pr-4">Linked employee</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-800">
                <td className="py-2 pr-4 font-medium text-white">{u.name}</td>
                <td className="py-2 pr-4 text-slate-400">{u.email}</td>
                <td className="py-2 pr-4">
                  <Badge tone="info">{ROLE_LABELS[u.role] ?? u.role}</Badge>
                </td>
                {org.multiLocationEnabled && (
                  <td className="py-2 pr-4 text-slate-400">{u.store?.name ?? "—"}</td>
                )}
                <td className="py-2 pr-4 text-slate-400">
                  {u.employee ? `${u.employee.name} (${u.employee.employeeCode})` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
