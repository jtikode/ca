import Link from "next/link";
import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { EmployeeForm } from "@/components/employees/EmployeeForm";
import { toggleEmployeeStatus } from "@/actions/employeeActions";
import { grossFromEarnings } from "@/lib/statutory";

export default async function EmployeesPage() {
  const session = await requireSession();

  const employees = await db.employee.findMany({
    where: { orgId: session.orgId },
    orderBy: { createdAt: "desc" },
    include: { salaryStructures: { orderBy: { effectiveFrom: "desc" }, take: 1 } },
  });

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-4 text-lg font-bold text-slate-900">Add employee</h2>
        <EmployeeForm />
      </Card>

      <Card className="overflow-x-auto">
        <h2 className="mb-4 text-lg font-bold text-slate-900">All employees</h2>
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
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
                    conveyance: Number(latest.conveyance),
                    medicalAllowance: Number(latest.medicalAllowance),
                    specialAllowance: Number(latest.specialAllowance),
                  })
                : 0;

              return (
                <tr key={emp.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-600">{emp.employeeCode}</td>
                  <td className="py-2 pr-4 font-medium text-slate-900">
                    <Link href={`/employees/${emp.id}`} className="hover:underline">
                      {emp.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-4 text-slate-600">{emp.state}</td>
                  <td className="py-2 pr-4 text-slate-600">₹{gross.toLocaleString("en-IN")}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={
                        emp.status === "ACTIVE"
                          ? "rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700"
                          : "rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500"
                      }
                    >
                      {emp.status === "ACTIVE" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    <form action={toggleEmployeeStatus.bind(null, emp.id, emp.status !== "ACTIVE")}>
                      <button type="submit" className="text-sm font-semibold text-blue-700 hover:underline">
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
