"use client";

import { useActionState } from "react";
import { calculateCtc, type CtcResult } from "@/actions/calculatorActions";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SUPPORTED_STATES } from "@/lib/validators";

const initialState: CtcResult = { ok: false };

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export function CalculatorForm() {
  const [state, formAction, pending] = useActionState(calculateCtc, initialState);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h2 className="mb-4 text-lg font-bold text-white">Monthly salary</h2>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Basic">
              <Input name="basic" type="number" min="0" step="1" required />
            </Field>
            <Field label="HRA">
              <Input name="hra" type="number" min="0" step="1" defaultValue={0} />
            </Field>
            <Field label="DA">
              <Input name="da" type="number" min="0" step="1" defaultValue={0} />
            </Field>
            <Field label="Conveyance">
              <Input name="conveyance" type="number" min="0" step="1" defaultValue={0} />
            </Field>
            <Field label="Medical allowance">
              <Input name="medicalAllowance" type="number" min="0" step="1" defaultValue={0} />
            </Field>
            <Field label="Special allowance">
              <Input name="specialAllowance" type="number" min="0" step="1" defaultValue={0} />
            </Field>
          </div>

          <Field label="State (for Professional Tax)">
            <Select name="state" defaultValue={SUPPORTED_STATES[0]} required>
              {SUPPORTED_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" name="pfApplicable" defaultChecked className="h-4 w-4" />
              PF applicable
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" name="esiApplicable" defaultChecked className="h-4 w-4" />
              ESI applicable
            </label>
          </div>

          <div className="border-t border-slate-800 pt-4">
            <p className="mb-2 text-sm font-semibold text-slate-300">Field staff daily expense (optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Daily allowance (₹/day)">
                <Input name="dailyFieldAllowance" type="number" min="0" step="1" placeholder="e.g. 200" />
              </Field>
              <Field label="Field days/month">
                <Input name="fieldDaysPerMonth" type="number" min="0" max="31" step="1" placeholder="e.g. 20" />
              </Field>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              For sales/delivery/field staff paid a travel or food allowance per day worked outside office — added
              to cost to company as a reimbursement, kept out of the PF/ESI/PT wage base below.
            </p>
          </div>

          <Button type="submit" disabled={pending}>
            {pending ? "Calculating..." : "Calculate"}
          </Button>
          {state.error && <p className="text-sm font-medium text-red-400">{state.error}</p>}
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-bold text-white">Cost to company</h2>
        {!state.ok ? (
          <p className="text-sm text-slate-400">Fill in the salary on the left and hit Calculate.</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-300">
                <span>Gross salary (monthly)</span>
                <span className="font-semibold text-white">{inr(state.grossEarnings!)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Employer PF (incl. EPS, EDLI)</span>
                <span className="font-semibold text-white">{inr(state.pfEmployer!)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Employer ESI</span>
                <span className="font-semibold text-white">{inr(state.esiEmployer!)}</span>
              </div>
              {state.fieldAllowanceTotal! > 0 && (
                <div className="flex justify-between text-slate-300">
                  <span>Field allowance (reimbursement)</span>
                  <span className="font-semibold text-white">{inr(state.fieldAllowanceTotal!)}</span>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-amber-400">Monthly CTC</span>
                <span className="text-xl font-bold text-white">{inr(state.employerMonthlyCost!)}</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-sm font-semibold text-amber-400">Annual CTC</span>
                <span className="text-lg font-bold text-white">{inr(state.employerAnnualCost!)}</span>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Employee side (deducted from gross)
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-300">
                  <span>Employee PF</span>
                  <span>-{inr(state.pfEmployee!)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Employee ESI</span>
                  <span>-{inr(state.esiEmployee!)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Professional Tax</span>
                  <span>-{inr(state.ptAmount!)}</span>
                </div>
                <div className="flex justify-between font-semibold text-emerald-400">
                  <span>Take-home (monthly)</span>
                  <span>{inr(state.employeeTakeHome!)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        <p className="mt-4 text-xs text-slate-500">
          Figures are computed estimates — income tax (TDS) isn&apos;t included here since it depends on
          declarations and regime choice. Consult your CA before relying on these numbers.
        </p>
      </Card>
    </div>
  );
}
