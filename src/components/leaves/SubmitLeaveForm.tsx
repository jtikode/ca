"use client";

import { useActionState } from "react";
import { submitLeaveRequest, type ActionResult } from "@/actions/leaveActions";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { LEAVE_TYPES } from "@/lib/validators";

const initialState: ActionResult = { ok: false, error: undefined };

const TYPE_LABELS: Record<(typeof LEAVE_TYPES)[number], string> = {
  CASUAL: "Casual",
  SICK: "Sick",
  EARNED: "Earned",
};

export function SubmitLeaveForm() {
  const [state, formAction, pending] = useActionState(submitLeaveRequest, initialState);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
      <Field label="Type">
        <Select name="type" defaultValue="CASUAL">
          {LEAVE_TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="From">
        <Input name="fromDate" type="date" required />
      </Field>
      <Field label="To">
        <Input name="toDate" type="date" required />
      </Field>
      <Field label="Reason (optional)">
        <Input name="reason" placeholder="Reason" />
      </Field>
      <div className="sm:col-span-2 lg:col-span-4">
        {state.error && <p className="mb-2 text-sm font-medium text-red-400">{state.error}</p>}
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting..." : "Submit request"}
        </Button>
      </div>
    </form>
  );
}
