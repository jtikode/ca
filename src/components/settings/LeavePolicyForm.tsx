"use client";

import { useActionState } from "react";
import { updateLeavePolicy, type ActionResult } from "@/actions/leavePolicyActions";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const initialState: ActionResult = { ok: false, error: undefined };

export function LeavePolicyForm({
  defaults,
}: {
  defaults: { casualLeavePerYear: number; sickLeavePerYear: number; earnedLeavePerYear: number };
}) {
  const [state, formAction, pending] = useActionState(updateLeavePolicy, initialState);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Field label="Casual leave (days/year)">
        <Input name="casualLeavePerYear" type="number" min="0" step="1" defaultValue={defaults.casualLeavePerYear} />
      </Field>
      <Field label="Sick leave (days/year)">
        <Input name="sickLeavePerYear" type="number" min="0" step="1" defaultValue={defaults.sickLeavePerYear} />
      </Field>
      <Field label="Earned leave (days/year)">
        <Input name="earnedLeavePerYear" type="number" min="0" step="1" defaultValue={defaults.earnedLeavePerYear} />
      </Field>
      <div className="col-span-full flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save leave policy"}
        </Button>
        {state.error && <p className="text-sm font-medium text-red-400">{state.error}</p>}
        {state.ok && <p className="text-sm font-medium text-emerald-400">Saved.</p>}
      </div>
    </form>
  );
}
