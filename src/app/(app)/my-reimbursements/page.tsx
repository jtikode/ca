import { notFound } from "next/navigation";
import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SubmitClaimForm } from "@/components/reimbursements/SubmitClaimForm";
import type { ReimbursementStatus } from "@/generated/prisma/client";

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

const STATUS_TONES: Record<ReimbursementStatus, "warning" | "success" | "danger" | "neutral"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  PAID: "neutral",
};

export default async function MyReimbursementsPage() {
  const session = await requireSession(["EMPLOYEE"]);
  if (!session.employeeId) notFound();

  const claims = await db.reimbursementClaim.findMany({
    where: { employeeId: session.employeeId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">My Reimbursements</h1>

      <Card>
        <h2 className="mb-1 text-lg font-bold text-white">Submit a claim</h2>
        <p className="mb-4 text-sm text-slate-400">
          Travel, medical, or other work expenses. Once approved by HR, it&apos;s added to your next payroll.
        </p>
        <SubmitClaimForm />
      </Card>

      <Card className="overflow-x-auto">
        <h2 className="mb-4 text-lg font-bold text-white">My claims</h2>
        {claims.length === 0 ? (
          <p className="text-sm text-slate-400">No claims submitted yet.</p>
        ) : (
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Description</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((c) => (
                <tr key={c.id} className="border-b border-slate-800">
                  <td className="py-2 pr-4 font-medium text-white">{c.category}</td>
                  <td className="py-2 pr-4 text-slate-400">{inr(Number(c.amount))}</td>
                  <td className="py-2 pr-4 text-slate-400">{c.description ?? "—"}</td>
                  <td className="py-2 pr-4">
                    <Badge tone={STATUS_TONES[c.status]}>{c.status}</Badge>
                    {c.status === "REJECTED" && c.reviewNote && (
                      <div className="mt-1 text-xs text-slate-500">{c.reviewNote}</div>
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
