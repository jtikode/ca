"use client";

import { useActionState, useState } from "react";
import { updateSalaryStructure, type ActionResult } from "@/actions/employeeActions";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const initialState: ActionResult = { ok: false, error: undefined };

interface OtherAllowanceRow {
  name: string;
  amount: number;
  basis: "FIXED" | "ATTENDANCE";
}

export function SalaryStructureForm({
  employeeId,
  defaults,
}: {
  employeeId: string;
  defaults: {
    basic: number;
    hra: number;
    da: number;
    conveyance: number;
    medicalAllowance: number;
    specialAllowance: number;
    otherAllowances: OtherAllowanceRow[];
  };
}) {
  const action = updateSalaryStructure.bind(null, employeeId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [rows, setRows] = useState<OtherAllowanceRow[]>(defaults.otherAllowances);

  function updateRow(i: number, patch: Partial<OtherAllowanceRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Field label="Basic">
          <Input name="basic" type="number" min="0" step="1" defaultValue={defaults.basic} required />
        </Field>
        <Field label="HRA">
          <Input name="hra" type="number" min="0" step="1" defaultValue={defaults.hra} required />
        </Field>
        <Field label="DA">
          <Input name="da" type="number" min="0" step="1" defaultValue={defaults.da} />
        </Field>
        <Field label="Conveyance">
          <Input name="conveyance" type="number" min="0" step="1" defaultValue={defaults.conveyance} />
        </Field>
        <Field label="Special allowance">
          <Input name="specialAllowance" type="number" min="0" step="1" defaultValue={defaults.specialAllowance} />
        </Field>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-300">Other allowances</p>
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Name"
                value={row.name}
                onChange={(e) => updateRow(i, { name: e.target.value })}
                className="w-40 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-white placeholder-slate-500"
              />
              <input
                type="number"
                placeholder="Amount"
                min="0"
                value={row.amount}
                onChange={(e) => updateRow(i, { amount: Number(e.target.value) })}
                className="w-28 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-white"
              />
              <select
                value={row.basis}
                onChange={(e) => updateRow(i, { basis: e.target.value as "FIXED" | "ATTENDANCE" })}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-white"
              >
                <option value="FIXED">Fixed</option>
                <option value="ATTENDANCE">Attendance-based</option>
              </select>
              <button
                type="button"
                onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-sm font-semibold text-red-400 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, { name: "", amount: 0, basis: "FIXED" }])}
          className="mt-2 text-sm font-semibold text-amber-400 hover:underline"
        >
          + Add allowance
        </button>
        <input type="hidden" name="otherAllowancesJson" value={JSON.stringify(rows)} readOnly />
      </div>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save revision"}
        </Button>
      </div>
      {state.error && <p className="text-sm font-medium text-red-400">{state.error}</p>}
      {state.ok && state.pending && (
        <p className="text-sm font-medium text-amber-400">Submitted — awaiting superadmin approval.</p>
      )}
      {state.ok && !state.pending && <p className="text-sm font-medium text-emerald-400">Salary structure updated.</p>}
    </form>
  );
}
