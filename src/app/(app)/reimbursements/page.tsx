import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ReviewClaimForm } from "@/components/reimbursements/ReviewClaimForm";
import { AddClaimToRunButton } from "@/components/reimbursements/AddClaimToRunButton";
import { MONTH_NAMES } from "@/lib/dates";
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

export default async function ReimbursementsPage() {
  const session = await requireSession(["SUPERADMIN", "HR_MANAGER"]);

  const [pending, approvedUnpaid, history, draftRun] = await Promise.all([
    db.reimbursementClaim.findMany({
      where: { orgId: session.orgId, status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { employee: { select: { name: true, employeeCode: true } } },
    }),
    db.reimbursementClaim.findMany({
      where: { orgId: session.orgId, status: "APPROVED" },
      orderBy: { createdAt: "asc" },
      include: { employee: { select: { name: true, employeeCode: true } } },
    }),
    db.reimbursementClaim.findMany({
      where: { orgId: session.orgId, status: { in: ["REJECTED", "PAID"] } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { employee: { select: { name: true, employeeCode: true } } },
    }),
    db.payrollRun.findFirst({ where: { orgId: session.orgId, status: "DRAFT" } }),
  ]);

  const runLabel = draftRun ? `${MONTH_NAMES[draftRun.month - 1]} ${draftRun.year}` : null;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Reimbursement Claims</h1>

      <Card className="overflow-x-auto">
        <h2 className="mb-1 text-lg font-bold text-white">Pending review</h2>
        <p className="mb-4 text-sm text-slate-400">Approve or reject each claim submitted by employees.</p>
        {pending.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing pending.</p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="py-2 pr-4">Employee</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Description</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {pending.map((c) => (
                <tr key={c.id} className="border-b border-slate-800 text-slate-300">
                  <td className="py-2 pr-4 font-medium text-white">
                    {c.employee.name} ({c.employee.employeeCode})
                  </td>
                  <td className="py-2 pr-4">{c.category}</td>
                  <td className="py-2 pr-4">{inr(Number(c.amount))}</td>
                  <td className="py-2 pr-4 text-slate-400">
                    {c.description ?? "—"}
                    {c.receiptUrl && (
                      <>
                        {" "}
                        ·{" "}
                        <a href={c.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
                          Receipt
                        </a>
                      </>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <ReviewClaimForm claimId={c.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="overflow-x-auto">
        <h2 className="mb-1 text-lg font-bold text-white">Approved — awaiting payout</h2>
        <p className="mb-4 text-sm text-slate-400">
          {runLabel
            ? `Add each to the ${runLabel} Draft run to pay it out.`
            : "Start a payroll run to pay these out — none is in Draft right now."}
        </p>
        {approvedUnpaid.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing approved and unpaid.</p>
        ) : (
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="py-2 pr-4">Employee</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {approvedUnpaid.map((c) => (
                <tr key={c.id} className="border-b border-slate-800 text-slate-300">
                  <td className="py-2 pr-4 font-medium text-white">
                    {c.employee.name} ({c.employee.employeeCode})
                  </td>
                  <td className="py-2 pr-4">{c.category}</td>
                  <td className="py-2 pr-4">{inr(Number(c.amount))}</td>
                  <td className="py-2 pr-4">
                    {draftRun && runLabel && <AddClaimToRunButton claimId={c.id} payrollRunId={draftRun.id} runLabel={runLabel} />}
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
          <p className="text-sm text-slate-500">No decided claims yet.</p>
        ) : (
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="py-2 pr-4">Employee</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((c) => (
                <tr key={c.id} className="border-b border-slate-800 text-slate-300">
                  <td className="py-2 pr-4 font-medium text-white">
                    {c.employee.name} ({c.employee.employeeCode})
                  </td>
                  <td className="py-2 pr-4">{c.category}</td>
                  <td className="py-2 pr-4">{inr(Number(c.amount))}</td>
                  <td className="py-2 pr-4">
                    <Badge tone={STATUS_TONES[c.status]}>{c.status}</Badge>
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
