"use client";

import { useActionState } from "react";
import { updateEmployeeDetails, type ActionResult } from "@/actions/employeeActions";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const initialState: ActionResult = { ok: false };

function toDateInputValue(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

export function EmployeeDetailsForm({
  employeeId,
  defaults,
}: {
  employeeId: string;
  defaults: {
    designation: string;
    employmentStage: string;
    probationEndDate: Date | null;
    employmentBasis: string;
    employeeCategory: string;
    ptApplicable: boolean;
    dol: Date | null;
  };
}) {
  const action = updateEmployeeDetails.bind(null, employeeId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Designation">
        <Input name="designation" defaultValue={defaults.designation} placeholder="e.g. Sales Executive" />
      </Field>
      <Field label="Employment stage">
        <Select name="employmentStage" defaultValue={defaults.employmentStage}>
          <option value="PROBATION">Probation</option>
          <option value="CONFIRMED">Confirmed</option>
        </Select>
      </Field>
      <Field label="Probation end date">
        <Input name="probationEndDate" type="date" defaultValue={toDateInputValue(defaults.probationEndDate)} />
      </Field>
      <Field label="Employment basis">
        <Select name="employmentBasis" defaultValue={defaults.employmentBasis}>
          <option value="PERMANENT">Permanent</option>
          <option value="CONTRACT">Contract</option>
        </Select>
      </Field>
      <Field label="Category">
        <Select name="employeeCategory" defaultValue={defaults.employeeCategory}>
          <option value="NON_MANAGERIAL">Non-managerial</option>
          <option value="MANAGERIAL">Managerial</option>
        </Select>
      </Field>
      <Field label="Date of leaving">
        <Input name="dol" type="date" defaultValue={toDateInputValue(defaults.dol)} />
      </Field>
      <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
        <input type="checkbox" name="ptApplicable" defaultChecked={defaults.ptApplicable} className="h-4 w-4" />
        Professional Tax applicable
      </label>

      <div className="col-span-full flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save details"}
        </Button>
        {state.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}
        {state.ok && <p className="text-sm font-medium text-green-700">Saved.</p>}
      </div>
      <p className="col-span-full text-xs text-slate-500">
        Set date of leaving to enable the experience and relieving letters below.
      </p>
    </form>
  );
}
