import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DecisionForm } from "@/components/common/DecisionForm";
import { reviewRegularization } from "@/actions/regularizationActions";

export default async function RegularizationsPage() {
  const session = await requireSession(["SUPERADMIN", "HR_MANAGER"]);

  const [pending, history] = await Promise.all([
    db.attendanceRegularization.findMany({
      where: { orgId: session.orgId, status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { employee: { select: { name: true, employeeCode: true } } },
    }),
    db.attendanceRegularization.findMany({
      where: { orgId: session.orgId, status: { in: ["APPROVED", "REJECTED"] } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { employee: { select: { name: true, employeeCode: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Attendance corrections</h1>

      <Card className="overflow-x-auto">
        <h2 className="mb-1 text-lg font-bold text-white">Pending review</h2>
        <p className="mb-4 text-sm text-slate-400">
          Approving writes the corrected day into attendance, so it affects pay for attendance based employees.
        </p>
        {pending.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing pending.</p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="py-2 pr-4">Employee</th>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Corrected to</th>
                <th className="py-2 pr-4">Reason</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {pending.map((r) => (
                <tr key={r.id} className="border-b border-slate-800 text-slate-300">
                  <td className="py-2 pr-4 font-medium text-white">
                    {r.employee.name} ({r.employee.employeeCode})
                  </td>
                  <td className="py-2 pr-4">{r.date.toLocaleDateString("en-IN")}</td>
                  <td className="py-2 pr-4">{r.markPresent ? "Present" : "Absent"}</td>
                  <td className="py-2 pr-4 text-slate-400">{r.reason ?? "-"}</td>
                  <td className="py-2 pr-4">
                    <DecisionForm action={reviewRegularization.bind(null, r.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="overflow-x-auto">
        <h2 className="mb-4 text-lg font-bold text-white">History</h2>
        {history.length === 0 ? (
          <p className="text-sm text-slate-500">No decided requests yet.</p>
        ) : (
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="py-2 pr-4">Employee</th>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Corrected to</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((r) => (
                <tr key={r.id} className="border-b border-slate-800 text-slate-300">
                  <td className="py-2 pr-4 font-medium text-white">
                    {r.employee.name} ({r.employee.employeeCode})
                  </td>
                  <td className="py-2 pr-4">{r.date.toLocaleDateString("en-IN")}</td>
                  <td className="py-2 pr-4">{r.markPresent ? "Present" : "Absent"}</td>
                  <td className="py-2 pr-4">
                    <Badge tone={r.status === "APPROVED" ? "success" : "danger"}>{r.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
