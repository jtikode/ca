"use client";

import { useActionState } from "react";
import { createLoan, type ActionResult } from "@/actions/loanActions";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const initialState: ActionResult = { ok: false, error: undefined };

export function AddLoanForm({ employees }: { employees: { id: string; name: string; employeeCode: string }[] }) {
  const [state, formAction, pending] = useActionState(createLoan, initialState);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
      <Field label="Employee">
        <Select name="employeeId" required defaultValue="">
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
      <Field label="Loan name">
        <Input name="name" required placeholder="e.g. Personal advance" />
      </Field>
      <Field label="Principal amount (₹)">
        <Input name="principalAmount" type="number" min="1" step="1" required />
      </Field>
      <Field label="EMI per month (₹)">
        <Input name="emiAmount" type="number" min="1" step="1" required />
      </Field>
      <div className="sm:col-span-2 lg:col-span-4">
        {state.error && <p className="mb-2 text-sm font-medium text-red-400">{state.error}</p>}
        <Button type="submit" disabled={pending}>
          {pending ? "Adding..." : "Add loan"}
        </Button>
      </div>
    </form>
  );
}
