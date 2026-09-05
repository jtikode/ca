"use client";

import { useActionState } from "react";
import { submitReimbursementClaim, type ActionResult } from "@/actions/reimbursementActions";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { REIMBURSEMENT_CATEGORIES } from "@/lib/validators";

const initialState: ActionResult = { ok: false, error: undefined };

const CATEGORY_LABELS: Record<(typeof REIMBURSEMENT_CATEGORIES)[number], string> = {
  TRAVEL: "Travel",
  MEDICAL: "Medical",
  OTHER: "Other",
};

export function SubmitClaimForm() {
  const [state, formAction, pending] = useActionState(submitReimbursementClaim, initialState);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Field label="Category">
        <Select name="category" defaultValue="TRAVEL">
          {REIMBURSEMENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Amount (₹)">
        <Input name="amount" type="number" min="1" step="1" required />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Description">
          <Input name="description" placeholder="What was this expense for?" />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Receipt link (optional)">
          <Input name="receiptUrl" type="url" placeholder="e.g. a Google Drive share link" />
        </Field>
      </div>
      <div className="sm:col-span-2">
        {state.error && <p className="mb-2 text-sm font-medium text-red-400">{state.error}</p>}
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting..." : "Submit claim"}
        </Button>
      </div>
    </form>
  );
}
