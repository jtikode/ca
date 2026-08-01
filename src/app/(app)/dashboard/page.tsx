import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";

export default async function DashboardPage() {
  const session = await requireSession();
  if (session.role === "EMPLOYEE") redirect("/my-payslips");

  const [employeeCount, lastRun, pendingApprovalCount, myRequests] = await Promise.all([
    db.employee.count({ where: { orgId: session.orgId, status: "ACTIVE" } }),
    db.payrollRun.findFirst({
      where: { orgId: session.orgId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
    session.role === "SUPERADMIN"
      ? db.approvalRequest.count({ where: { orgId: session.orgId, status: "PENDING" } })
      : Promise.resolve(0),
    session.role === "HR_MANAGER"
      ? db.approvalRequest.findMany({
          where: { orgId: session.orgId, requestedById: session.userId, status: "PENDING" },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Active employees</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{employeeCount}</p>
          <Link href="/employees" className="mt-2 inline-block text-sm font-semibold text-blue-700 hover:underline">
            Manage employees
          </Link>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Last payroll run</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">
            {lastRun ? `${lastRun.month}/${lastRun.year}` : "None yet"}
          </p>
          <Link href="/payroll" className="mt-2 inline-block text-sm font-semibold text-blue-700 hover:underline">
            {lastRun ? "View payroll" : "Run your first payroll"}
          </Link>
        </Card>
        {session.role === "SUPERADMIN" ? (
          <Card>
            <p className="text-sm text-slate-500">Pending approvals</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{pendingApprovalCount}</p>
            <Link href="/approvals" className="mt-2 inline-block text-sm font-semibold text-blue-700 hover:underline">
              Review approvals
            </Link>
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-slate-500">Status</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">
              {lastRun?.status === "FINALIZED" ? "Finalized" : lastRun ? "Draft" : "—"}
            </p>
          </Card>
        )}
      </div>

      {session.role === "HR_MANAGER" && myRequests.length > 0 && (
        <Card>
          <h2 className="mb-3 text-lg font-bold text-slate-900">Your pending requests</h2>
          <ul className="space-y-2 text-sm text-slate-700">
            {myRequests.map((req) => (
              <li key={req.id} className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span>{req.type === "CREATE_EMPLOYEE" ? "Add employee" : "Salary change"} — awaiting approval</span>
                <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                  Pending
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {employeeCount === 0 && (
        <Card>
          <h2 className="text-lg font-bold text-slate-900">Get started</h2>
          <p className="mt-1 text-sm text-slate-600">
            Add your employees, then run your first payroll and export a package for your CA.
          </p>
          <Link
            href="/employees"
            className="mt-3 inline-block rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Add employees
          </Link>
        </Card>
      )}
    </div>
  );
}
