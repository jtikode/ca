"use client";

import { useActionState, useEffect, useRef } from "react";
import { addArrears } from "@/actions/earningsActions";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function ArrearsForm({ employees }: { employees: { id: string; name: string; employeeCode: string }[] }) {
  const [state, action, pending] = useActionState(addArrears, { ok: false } as { ok: boolean; error?: string });
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="flex flex-wrap items-end gap-3">
      <Field label="Employee">
        <Select name="employeeId" required defaultValue="" className="w-56">
          <option value="" disabled>
            Select employee
          </option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} ({e.employeeCode})
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Months of arrears">
        <Input name="months" type="number" min="0.5" step="0.5" required className="w-32" />
      </Field>
      <Field label="Difference per month (₹)">
        <Input name="monthlyDifference" type="number" min="1" step="1" required className="w-40" />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding..." : "Add to draft run"}
      </Button>
      {state.error && <p className="w-full text-sm font-medium text-red-400">{state.error}</p>}
      {state.ok && <p className="w-full text-sm font-medium text-emerald-400">Added to the Draft run.</p>}
    </form>
  );
}
