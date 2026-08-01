import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { InviteHrManagerForm } from "@/components/team/InviteHrManagerForm";
import { CreateEmployeeLoginForm } from "@/components/team/CreateEmployeeLoginForm";

const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: "Super Admin",
  HR_MANAGER: "HR Manager",
  EMPLOYEE: "Employee",
};

export default async function TeamPage() {
  const session = await requireSession(["SUPERADMIN"]);

  const [users, employeesWithoutLogin] = await Promise.all([
    db.user.findMany({
      where: { orgId: session.orgId },
      orderBy: { createdAt: "asc" },
      include: { employee: { select: { name: true, employeeCode: true } } },
    }),
    db.employee.findMany({
      where: { orgId: session.orgId, status: "ACTIVE", loginUser: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, employeeCode: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Team</h1>

      <Card>
        <h2 className="mb-4 text-lg font-bold text-slate-900">Invite an HR manager</h2>
        <InviteHrManagerForm />
      </Card>

      <Card>
        <h2 className="mb-1 text-lg font-bold text-slate-900">Create an employee login</h2>
        <p className="mb-4 text-sm text-slate-500">
          Gives an employee self-service access to their own profile and payslips.
        </p>
        <CreateEmployeeLoginForm employees={employeesWithoutLogin} />
      </Card>

      <Card className="overflow-x-auto">
        <h2 className="mb-4 text-lg font-bold text-slate-900">All logins</h2>
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Role</th>
              <th className="py-2 pr-4">Linked employee</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-100">
                <td className="py-2 pr-4 font-medium text-slate-900">{u.name}</td>
                <td className="py-2 pr-4 text-slate-600">{u.email}</td>
                <td className="py-2 pr-4">
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                    {ROLE_LABELS[u.role] ?? u.role}
                  </span>
                </td>
                <td className="py-2 pr-4 text-slate-600">
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
