import Link from "next/link";
import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmployeeForm } from "@/components/employees/EmployeeForm";
import { BulkUploadForm } from "@/components/employees/BulkUploadForm";
import { toggleEmployeeStatus } from "@/actions/employeeActions";
import { grossFromEarnings } from "@/lib/statutory";

export default async function EmployeesPage() {
  const session = await requireSession(["SUPERADMIN", "HR_MANAGER"]);

  const [employees, pendingApprovalCount] = await Promise.all([
    db.employee.findMany({
      where: { orgId: session.orgId },
      orderBy: { createdAt: "desc" },
      include: { salaryStructures: { orderBy: { effectiveFrom: "desc" }, take: 1 } },
    }),
    session.role === "SUPERADMIN"
      ? db.approvalRequest.count({ where: { orgId: session.orgId, status: "PENDING" } })
      : Promise.resolve(0),
  ]);

  return (
    <div className="space-y-6">
      {pendingApprovalCount > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/10">
          <p className="text-sm font-medium text-amber-400">
            {pendingApprovalCount} request{pendingApprovalCount === 1 ? "" : "s"} waiting for your approval.{" "}
            <Link href="/approvals" className="font-semibold underline">
              Review now
            </Link>
          </p>
        </Card>
      )}

      <Card>
        <h2 className="mb-4 text-lg font-bold text-white">Add employee</h2>
        <EmployeeForm />
      </Card>

      <Card>
        <h2 className="mb-1 text-lg font-bold text-white">Bulk upload</h2>
        <p className="mb-4 text-sm text-slate-400">
          Download the template, fill in one row per employee, then upload the same file.
        </p>
        <BulkUploadForm />
      </Card>

      <Card className="overflow-x-auto">
        <h2 className="mb-4 text-lg font-bold text-white">All employees</h2>
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="py-2 pr-4">Code</th>
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">State</th>
              <th className="py-2 pr-4">Gross (monthly)</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => {
              const latest = emp.salaryStructures[0];
              const gross = latest
                ? grossFromEarnings({
                    basic: Number(latest.basic),
                    hra: Number(latest.hra),
                    da: Number(latest.da),
                    conveyance: Number(latest.conveyance),
                    medicalAllowance: Number(latest.medicalAllowance),
                    specialAllowance: Number(latest.specialAllowance),
                  })
                : 0;

              return (
                <tr key={emp.id} className="border-b border-slate-800">
                  <td className="py-2 pr-4 text-slate-400">{emp.employeeCode}</td>
                  <td className="py-2 pr-4 font-medium text-white">
                    <Link href={`/employees/${emp.id}`} className="hover:underline">
                      {emp.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-4 text-slate-400">{emp.state}</td>
                  <td className="py-2 pr-4 text-slate-400">₹{gross.toLocaleString("en-IN")}</td>
                  <td className="py-2 pr-4">
                    <Badge tone={emp.status === "ACTIVE" ? "success" : "neutral"}>
                      {emp.status === "ACTIVE" ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="py-2 pr-4">
                    <form action={toggleEmployeeStatus.bind(null, emp.id, emp.status !== "ACTIVE")}>
                      <button type="submit" className="text-sm font-semibold text-amber-400 hover:underline">
                        {emp.status === "ACTIVE" ? "Deactivate" : "Activate"}
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {employees.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-slate-400">
                  No employees yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
