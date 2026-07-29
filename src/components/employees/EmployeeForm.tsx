"use client";

import { useActionState } from "react";
import { createEmployee, type ActionResult } from "@/actions/employeeActions";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { SUPPORTED_STATES } from "@/lib/validators";

const initialState: ActionResult = { ok: false, error: undefined };

export function EmployeeForm() {
  const [state, formAction, pending] = useActionState(createEmployee, initialState);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Employee code">
        <Input name="employeeCode" required />
      </Field>
      <Field label="Full name">
        <Input name="name" required />
      </Field>
      <Field label="Date of joining">
        <Input name="doj" type="date" required />
      </Field>
      <Field label="State">
        <Select name="state" required defaultValue={SUPPORTED_STATES[0]}>
          {SUPPORTED_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
          <option value="Other">Other</option>
        </Select>
      </Field>

      <Field label="PAN">
        <Input name="pan" />
      </Field>
      <Field label="UAN (if any)">
        <Input name="uan" />
      </Field>
      <Field label="Bank account no.">
        <Input name="bankAccountNo" />
      </Field>
      <Field label="Bank IFSC">
        <Input name="bankIfsc" />
      </Field>

      <Field label="Basic (monthly)">
        <Input name="basic" type="number" min="0" step="1" required />
      </Field>
      <Field label="HRA (monthly)">
        <Input name="hra" type="number" min="0" step="1" required />
      </Field>
      <Field label="Conveyance (monthly)">
        <Input name="conveyance" type="number" min="0" step="1" defaultValue={0} />
      </Field>
      <Field label="Special allowance (monthly)">
        <Input name="specialAllowance" type="number" min="0" step="1" defaultValue={0} />
      </Field>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="pfApplicable" defaultChecked className="h-4 w-4" />
        PF applicable
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="esiApplicable" defaultChecked className="h-4 w-4" />
        ESI applicable
      </label>

      <div className="col-span-full flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Adding..." : "Add employee"}
        </Button>
        {state.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}
        {state.ok && <p className="text-sm font-medium text-green-700">Employee added.</p>}
      </div>
    </form>
  );
}
