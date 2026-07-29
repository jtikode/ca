import Link from "next/link";
import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";

export default async function DashboardPage() {
  const session = await requireSession();

  const [employeeCount, lastRun] = await Promise.all([
    db.employee.count({ where: { orgId: session.orgId, status: "ACTIVE" } }),
    db.payrollRun.findFirst({
      where: { orgId: session.orgId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
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
        <Card>
          <p className="text-sm text-slate-500">Status</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">
            {lastRun?.status === "FINALIZED" ? "Finalized" : lastRun ? "Draft" : "—"}
          </p>
        </Card>
      </div>

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
