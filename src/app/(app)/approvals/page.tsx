import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { ApprovalActions } from "@/components/approvals/ApprovalActions";

interface CreateEmployeePayload {
  employeeCode: string;
  name: string;
  state: string;
  basic: number;
  hra: number;
}

interface UpdateSalaryPayload {
  employeeId: string;
  basic: number;
  hra: number;
}

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default async function ApprovalsPage() {
  const session = await requireSession(["SUPERADMIN"]);

  const pending = await db.approvalRequest.findMany({
    where: { orgId: session.orgId, status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { requestedBy: { select: { name: true } } },
  });

  const salaryEmployeeIds = pending
    .filter((r) => r.type === "UPDATE_SALARY")
    .map((r) => (r.payload as unknown as UpdateSalaryPayload).employeeId);

  const salaryEmployees = salaryEmployeeIds.length
    ? await db.employee.findMany({
        where: { id: { in: salaryEmployeeIds } },
        select: { id: true, name: true, employeeCode: true },
      })
    : [];
  const employeeById = new Map(salaryEmployees.map((e) => [e.id, e]));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Approvals</h1>

      <Card className="overflow-x-auto">
        <h2 className="mb-1 text-lg font-bold text-white">Pending requests</h2>
        <p className="mb-4 text-sm text-slate-400">
          Changes submitted by HR managers wait here until you approve or reject them.
        </p>
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="py-2 pr-4">Requested by</th>
              <th className="py-2 pr-4">Change</th>
              <th className="py-2 pr-4">Submitted</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {pending.map((req) => {
              let summary: string;
              if (req.type === "CREATE_EMPLOYEE") {
                const p = req.payload as unknown as CreateEmployeePayload;
                summary = `Add employee ${p.name} (${p.employeeCode}) — Basic ${inr(p.basic)}, HRA ${inr(p.hra)}, ${p.state}`;
              } else {
                const p = req.payload as unknown as UpdateSalaryPayload;
                const emp = employeeById.get(p.employeeId);
                summary = `Change salary for ${emp ? `${emp.name} (${emp.employeeCode})` : "an employee"} — Basic ${inr(p.basic)}, HRA ${inr(p.hra)}`;
              }

              return (
                <tr key={req.id} className="border-b border-slate-800 align-top">
                  <td className="py-3 pr-4 font-medium text-white">{req.requestedBy.name}</td>
                  <td className="py-3 pr-4 text-slate-300">{summary}</td>
                  <td className="py-3 pr-4 text-slate-500">{req.createdAt.toLocaleDateString("en-IN")}</td>
                  <td className="py-3 pr-4">
                    <ApprovalActions requestId={req.id} />
                  </td>
                </tr>
              );
            })}
            {pending.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-slate-400">
                  Nothing pending.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
