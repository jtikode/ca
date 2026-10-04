import { notFound } from "next/navigation";
import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RegularizationForm } from "@/components/common/InlineForms";

const TONES = { PENDING: "warning", APPROVED: "success", REJECTED: "danger" } as const;

export default async function MyAttendancePage() {
  const session = await requireSession(["EMPLOYEE"]);
  if (!session.employeeId) notFound();

  const requests = await db.attendanceRegularization.findMany({
    where: { employeeId: session.employeeId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">My Attendance</h1>

      <Card>
        <h2 className="mb-1 text-lg font-bold text-white">Request a correction</h2>
        <p className="mb-4 text-sm text-slate-400">
          Missed a punch or have a wrong day on record? Ask HR to correct it. Once approved, the day is updated in
          attendance.
        </p>
        <RegularizationForm />
      </Card>

      <Card className="overflow-x-auto">
        <h2 className="mb-4 text-lg font-bold text-white">My requests</h2>
        {requests.length === 0 ? (
          <p className="text-sm text-slate-400">No correction requests yet.</p>
        ) : (
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Corrected to</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-slate-800">
                  <td className="py-2 pr-4 font-medium text-white">{r.date.toLocaleDateString("en-IN")}</td>
                  <td className="py-2 pr-4 text-slate-400">{r.markPresent ? "Present" : "Absent"}</td>
                  <td className="py-2 pr-4">
                    <Badge tone={TONES[r.status]}>{r.status}</Badge>
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
