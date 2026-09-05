import { notFound } from "next/navigation";
import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SubmitLeaveForm } from "@/components/leaves/SubmitLeaveForm";
import type { LeaveRequestStatus, LeaveType } from "@/generated/prisma/client";

const STATUS_TONES: Record<LeaveRequestStatus, "warning" | "success" | "danger"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

export default async function MyLeavesPage() {
  const session = await requireSession(["EMPLOYEE"]);
  if (!session.employeeId) notFound();

  const [employee, leavePolicy, requests] = await Promise.all([
    db.employee.findFirst({ where: { id: session.employeeId, orgId: session.orgId }, select: { state: true } }),
    db.leavePolicy.findUnique({ where: { orgId: session.orgId } }),
    db.leaveRequest.findMany({ where: { employeeId: session.employeeId }, orderBy: { createdAt: "desc" } }),
  ]);
  if (!employee) notFound();

  // "Taken" is approved days falling in the current calendar year — the
  // simplest possible balance given LeavePolicy's own entitlement is an
  // annual (not FY-precise) approximation too, see its schema comment.
  const currentYear = new Date().getFullYear();
  const takenByType: Record<LeaveType, number> = { CASUAL: 0, SICK: 0, EARNED: 0 };
  for (const r of requests) {
    if (r.status === "APPROVED" && r.fromDate.getFullYear() === currentYear) {
      takenByType[r.type] += Number(r.days);
    }
  }

  const entitlements: { type: LeaveType; label: string; perYear: number }[] = leavePolicy
    ? [
        { type: "CASUAL", label: "Casual leave", perYear: leavePolicy.casualLeavePerYear },
        { type: "SICK", label: "Sick leave", perYear: leavePolicy.sickLeavePerYear },
        { type: "EARNED", label: "Earned leave", perYear: leavePolicy.earnedLeavePerYear },
      ]
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">My Leaves</h1>

      {entitlements.length > 0 && (
        <Card>
          <h2 className="mb-1 text-lg font-bold text-white">Leave balance ({currentYear})</h2>
          <p className="mb-4 text-sm text-slate-400">
            Entitlement is an annual figure from your company&apos;s policy; &quot;taken&quot; counts only requests
            already approved.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {entitlements.map((e) => (
              <div key={e.type} className="rounded-xl border border-slate-800 bg-ink-950/70 p-3">
                <div className="text-xs text-slate-500">{e.label}</div>
                <div className="text-lg font-bold text-white">
                  {Math.max(0, e.perYear - takenByType[e.type])} / {e.perYear}
                </div>
                <div className="text-xs text-slate-500">remaining</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="mb-1 text-lg font-bold text-white">Request leave</h2>
        <p className="mb-4 text-sm text-slate-400">Submitted requests need HR/admin approval.</p>
        <SubmitLeaveForm />
      </Card>

      <Card className="overflow-x-auto">
        <h2 className="mb-4 text-lg font-bold text-white">My requests</h2>
        {requests.length === 0 ? (
          <p className="text-sm text-slate-400">No leave requests yet.</p>
        ) : (
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Dates</th>
                <th className="py-2 pr-4">Days</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-slate-800">
                  <td className="py-2 pr-4 font-medium text-white">{r.type}</td>
                  <td className="py-2 pr-4 text-slate-400">
                    {r.fromDate.toLocaleDateString("en-IN")} – {r.toDate.toLocaleDateString("en-IN")}
                  </td>
                  <td className="py-2 pr-4 text-slate-400">{Number(r.days)}</td>
                  <td className="py-2 pr-4">
                    <Badge tone={STATUS_TONES[r.status]}>{r.status}</Badge>
                    {r.status === "REJECTED" && r.reviewNote && (
                      <div className="mt-1 text-xs text-slate-500">{r.reviewNote}</div>
                    )}
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
