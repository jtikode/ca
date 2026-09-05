import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ReviewLeaveForm } from "@/components/leaves/ReviewLeaveForm";
import type { LeaveRequestStatus } from "@/generated/prisma/client";

const STATUS_TONES: Record<LeaveRequestStatus, "warning" | "success" | "danger"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

export default async function LeavesPage() {
  const session = await requireSession(["SUPERADMIN", "HR_MANAGER"]);

  const [pending, history] = await Promise.all([
    db.leaveRequest.findMany({
      where: { orgId: session.orgId, status: "PENDING" },
      orderBy: { fromDate: "asc" },
      include: { employee: { select: { name: true, employeeCode: true } } },
    }),
    db.leaveRequest.findMany({
      where: { orgId: session.orgId, status: { in: ["APPROVED", "REJECTED"] } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { employee: { select: { name: true, employeeCode: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Leave Requests</h1>

      <Card className="overflow-x-auto">
        <h2 className="mb-1 text-lg font-bold text-white">Pending review</h2>
        <p className="mb-4 text-sm text-slate-400">
          A decision here is a record only — it doesn&apos;t touch attendance or payroll.
        </p>
        {pending.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing pending.</p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="py-2 pr-4">Employee</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Dates</th>
                <th className="py-2 pr-4">Days</th>
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
                  <td className="py-2 pr-4">{r.type}</td>
                  <td className="py-2 pr-4">
                    {r.fromDate.toLocaleDateString("en-IN")} – {r.toDate.toLocaleDateString("en-IN")}
                  </td>
                  <td className="py-2 pr-4">{Number(r.days)}</td>
                  <td className="py-2 pr-4 text-slate-400">{r.reason ?? "—"}</td>
                  <td className="py-2 pr-4">
                    <ReviewLeaveForm requestId={r.id} />
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
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="py-2 pr-4">Employee</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Dates</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((r) => (
                <tr key={r.id} className="border-b border-slate-800 text-slate-300">
                  <td className="py-2 pr-4 font-medium text-white">
                    {r.employee.name} ({r.employee.employeeCode})
                  </td>
                  <td className="py-2 pr-4">{r.type}</td>
                  <td className="py-2 pr-4">
                    {r.fromDate.toLocaleDateString("en-IN")} – {r.toDate.toLocaleDateString("en-IN")}
                  </td>
                  <td className="py-2 pr-4">
                    <Badge tone={STATUS_TONES[r.status]}>{r.status}</Badge>
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
