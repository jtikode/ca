"use client";

import { useActionState } from "react";
import { saveTaxDeclaration, type ActionResult } from "@/actions/employeeActions";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const initialState: ActionResult = { ok: false, error: undefined };

export function TaxDeclarationForm({
  employeeId,
  financialYear,
  defaults,
}: {
  employeeId: string;
  financialYear: string;
  defaults?: {
    regime: string;
    section80C: number;
    section80D: number;
    hraRentPaid: number;
    homeLoanInterest: number;
    otherIncome: number;
  };
}) {
  const action = saveTaxDeclaration.bind(null, employeeId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <input type="hidden" name="financialYear" value={financialYear} />
      <Field label={`Regime (FY ${financialYear})`}>
        <Select name="regime" defaultValue={defaults?.regime ?? "NEW"} required>
          <option value="NEW">New</option>
          <option value="OLD">Old</option>
        </Select>
      </Field>
      <Field label="Annual rent paid (for HRA)">
        <Input name="hraRentPaid" type="number" min="0" step="1" defaultValue={defaults?.hraRentPaid ?? 0} />
      </Field>
      <Field label="Section 80C investments">
        <Input name="section80C" type="number" min="0" step="1" defaultValue={defaults?.section80C ?? 0} />
      </Field>
      <Field label="Section 80D (health insurance)">
        <Input name="section80D" type="number" min="0" step="1" defaultValue={defaults?.section80D ?? 0} />
      </Field>
      <Field label="Home loan interest">
        <Input name="homeLoanInterest" type="number" min="0" step="1" defaultValue={defaults?.homeLoanInterest ?? 0} />
      </Field>
      <Field label="Other annual income">
        <Input name="otherIncome" type="number" min="0" step="1" defaultValue={defaults?.otherIncome ?? 0} />
      </Field>
      <div className="col-span-full flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save declaration"}
        </Button>
        {state.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}
        {state.ok && <p className="text-sm font-medium text-green-700">Saved.</p>}
      </div>
      <p className="col-span-full text-xs text-slate-500">
        Old regime deductions (80C, 80D, HRA exemption, home loan interest) only apply when the old regime is
        selected.
      </p>
    </form>
  );
}
