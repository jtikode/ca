import { notFound } from "next/navigation";
import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProfileChangeForm } from "@/components/common/ProfileChangeForm";
import { PROFILE_FIELD_LABELS, type ProfileField } from "@/lib/profileChanges";

const TONES = { PENDING: "warning", APPROVED: "success", REJECTED: "danger" } as const;

export default async function MyProfilePage() {
  const session = await requireSession(["EMPLOYEE"]);
  if (!session.employeeId) notFound();

  const [employee, requests] = await Promise.all([
    db.employee.findFirst({ where: { id: session.employeeId, orgId: session.orgId } }),
    db.profileChangeRequest.findMany({ where: { employeeId: session.employeeId }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  if (!employee) notFound();

  const current = {
    email: employee.email ?? "",
    dob: employee.dob ? employee.dob.toISOString().slice(0, 10) : "",
    pan: employee.pan ?? "",
    uan: employee.uan ?? "",
    bankAccountNo: employee.bankAccountNo ?? "",
    bankIfsc: employee.bankIfsc ?? "",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">{employee.name}</h1>
        <p className="text-sm text-slate-400">
          {employee.employeeCode}
          {employee.designation ? ` · ${employee.designation}` : ""}
        </p>
      </div>

      <Card>
        <h2 className="mb-1 text-lg font-bold text-white">My details</h2>
        <p className="mb-4 text-sm text-slate-400">
          Change what is wrong and send it. HR reviews every change before it takes effect, so a salary transfer never
          goes to a mistyped account.
        </p>
        <ProfileChangeForm current={current} disabled={requests.some((r) => r.status === "PENDING")} />
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-bold text-white">My requests</h2>
        {requests.length === 0 ? (
          <p className="text-sm text-slate-400">No requests yet.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {requests.map((r) => (
              <li key={r.id} className="border-b border-slate-800 pb-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-300">
                    {Object.keys(r.changes as object)
                      .map((k) => PROFILE_FIELD_LABELS[k as ProfileField] ?? k)
                      .join(", ")}
                  </span>
                  <Badge tone={TONES[r.status]}>{r.status}</Badge>
                </div>
                {r.status === "REJECTED" && r.reviewNote && <div className="mt-1 text-xs text-slate-500">{r.reviewNote}</div>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
