import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DecisionForm } from "@/components/common/DecisionForm";
import { reviewProfileChange } from "@/actions/profileActions";
import { PROFILE_FIELDS, PROFILE_FIELD_LABELS, type ProfileField } from "@/lib/profileChanges";

function currentOf(e: { email: string | null; dob: Date | null; pan: string | null; uan: string | null; bankAccountNo: string | null; bankIfsc: string | null }, f: ProfileField) {
  if (f === "dob") return e.dob ? e.dob.toISOString().slice(0, 10) : "(blank)";
  return e[f] || "(blank)";
}

export default async function ProfileChangesPage() {
  const session = await requireSession(["SUPERADMIN", "HR_MANAGER"]);

  const [pending, history] = await Promise.all([
    db.profileChangeRequest.findMany({
      where: { orgId: session.orgId, status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { employee: true },
    }),
    db.profileChangeRequest.findMany({
      where: { orgId: session.orgId, status: { in: ["APPROVED", "REJECTED"] } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { employee: { select: { name: true, employeeCode: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Profile change requests</h1>

      <Card>
        <h2 className="mb-1 text-lg font-bold text-white">Pending review</h2>
        <p className="mb-4 text-sm text-slate-400">
          Check bank account and IFSC changes especially, they decide where salary is paid.
        </p>
        {pending.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing pending.</p>
        ) : (
          <div className="space-y-4">
            {pending.map((r) => {
              const changes = r.changes as Partial<Record<ProfileField, string>>;
              return (
                <div key={r.id} className="rounded-xl border border-slate-800 bg-ink-950/70 p-4">
                  <div className="mb-2 text-sm font-semibold text-white">
                    {r.employee.name} ({r.employee.employeeCode})
                  </div>
                  <ul className="mb-3 space-y-1 text-sm">
                    {PROFILE_FIELDS.filter((f) => changes[f] !== undefined).map((f) => (
                      <li key={f} className="text-slate-300">
                        <span className="text-slate-500">{PROFILE_FIELD_LABELS[f]}:</span> {currentOf(r.employee, f)}{" "}
                        <span className="text-slate-500">to</span>{" "}
                        <span className="font-semibold text-amber-400">{changes[f]}</span>
                      </li>
                    ))}
                  </ul>
                  <DecisionForm action={reviewProfileChange.bind(null, r.id)} />
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="overflow-x-auto">
        <h2 className="mb-4 text-lg font-bold text-white">History</h2>
        {history.length === 0 ? (
          <p className="text-sm text-slate-500">No decided requests yet.</p>
        ) : (
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="py-2 pr-4">Employee</th>
                <th className="py-2 pr-4">Changed</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((r) => (
                <tr key={r.id} className="border-b border-slate-800 text-slate-300">
                  <td className="py-2 pr-4 font-medium text-white">
                    {r.employee.name} ({r.employee.employeeCode})
                  </td>
                  <td className="py-2 pr-4">
                    {Object.keys(r.changes as object)
                      .map((k) => PROFILE_FIELD_LABELS[k as ProfileField] ?? k)
                      .join(", ")}
                  </td>
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
