"use client";

import { useActionState, useState } from "react";
import { addPayrollAdjustment, removePayrollAdjustment, type ActionResult } from "@/actions/payrollActions";

const initialState: ActionResult = { ok: false, error: undefined };

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export function PayrollAdjustmentForm({
  payrollRunId,
  employeeId,
  adjustments,
}: {
  payrollRunId: string;
  employeeId: string;
  adjustments: { id: string; name: string; amount: number; type: "EARNING" | "DEDUCTION" }[];
}) {
  const [open, setOpen] = useState(false);
  const action = addPayrollAdjustment.bind(null, payrollRunId, employeeId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="space-y-1">
      {adjustments.map((a) => (
        <div key={a.id} className="flex items-center gap-1.5 text-xs">
          <span className={a.type === "EARNING" ? "text-emerald-400" : "text-red-400"}>
            {a.name}: {a.type === "EARNING" ? "+" : "-"}
            {inr(a.amount)}
          </span>
          <form action={removePayrollAdjustment.bind(null, a.id)}>
            <button type="submit" className="text-slate-500 hover:text-red-400" aria-label={`Remove ${a.name}`}>
              ×
            </button>
          </form>
        </div>
      ))}

      {open ? (
        <form action={formAction} className="flex flex-wrap items-center gap-1.5">
          <input
            type="text"
            name="name"
            placeholder="Name"
            required
            className="w-24 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white placeholder-slate-500"
          />
          <input
            type="number"
            name="amount"
            placeholder="Amount"
            min="0"
            step="1"
            required
            className="w-20 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
          />
          <select
            name="type"
            defaultValue="EARNING"
            className="rounded border border-slate-700 bg-slate-900 px-1 py-1 text-xs text-white"
          >
            <option value="EARNING">Earning</option>
            <option value="DEDUCTION">Deduction</option>
          </select>
          <button type="submit" disabled={pending} className="text-xs font-semibold text-amber-400 hover:underline">
            {pending ? "..." : "Add"}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-500 hover:underline">
            Cancel
          </button>
          {state.error && <span className="w-full text-xs text-red-400">{state.error}</span>}
        </form>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="text-xs font-semibold text-amber-400 hover:underline">
          + Adjustment
        </button>
      )}
    </div>
  );
}
