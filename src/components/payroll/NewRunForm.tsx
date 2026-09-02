"use client";

import { useActionState } from "react";
import { createPayrollRun, type ActionResult } from "@/actions/payrollActions";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { MONTH_NAMES } from "@/lib/dates";

const initialState: ActionResult = { ok: false, error: undefined };
const now = new Date();

export function NewRunForm() {
  const [state, formAction, pending] = useActionState(createPayrollRun, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <Field label="Month">
        <Select name="month" defaultValue={now.getMonth() + 1} required>
          {MONTH_NAMES.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Year">
        <Input name="year" type="number" defaultValue={now.getFullYear()} required className="w-28" />
      </Field>
      <label className="flex items-center gap-2 pb-2.5 text-sm text-slate-300">
        <input type="checkbox" name="copyFromLastRun" defaultChecked className="h-4 w-4" />
        Copy adjustments and days-paid from last month
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Starting..." : "Start payroll run"}
      </Button>
      {state.error && <p className="text-sm font-medium text-red-400">{state.error}</p>}
      <p className="w-full text-xs text-slate-500">
        Same salary every month? Leave this checked — full-attendance employees still just get the new month&apos;s
        full days automatically. Uncheck only if this month is different.
      </p>
    </form>
  );
}
