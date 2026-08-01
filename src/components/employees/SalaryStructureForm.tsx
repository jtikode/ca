"use client";

import { useActionState } from "react";
import { updateSalaryStructure, type ActionResult } from "@/actions/employeeActions";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const initialState: ActionResult = { ok: false, error: undefined };

export function SalaryStructureForm({
  employeeId,
  defaults,
}: {
  employeeId: string;
  defaults: { basic: number; hra: number; conveyance: number; medicalAllowance: number; specialAllowance: number };
}) {
  const action = updateSalaryStructure.bind(null, employeeId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <Field label="Basic">
        <Input name="basic" type="number" min="0" step="1" defaultValue={defaults.basic} required />
      </Field>
      <Field label="HRA">
        <Input name="hra" type="number" min="0" step="1" defaultValue={defaults.hra} required />
      </Field>
      <Field label="Conveyance">
        <Input name="conveyance" type="number" min="0" step="1" defaultValue={defaults.conveyance} />
      </Field>
      <Field label="Special allowance">
        <Input name="specialAllowance" type="number" min="0" step="1" defaultValue={defaults.specialAllowance} />
      </Field>
      <div className="flex items-end">
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Saving..." : "Save revision"}
        </Button>
      </div>
      {state.error && <p className="col-span-full text-sm font-medium text-red-600">{state.error}</p>}
      {state.ok && state.pending && (
        <p className="col-span-full text-sm font-medium text-amber-700">Submitted — awaiting superadmin approval.</p>
      )}
      {state.ok && !state.pending && (
        <p className="col-span-full text-sm font-medium text-green-700">Salary structure updated.</p>
      )}
    </form>
  );
}
