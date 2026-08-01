"use client";

import { useActionState } from "react";
import { createOrganization, type CreateOrgResult } from "@/actions/platformActions";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { SUPPORTED_STATES } from "@/lib/validators";

const initialState: CreateOrgResult = { ok: false };

export function CreateOrganizationForm() {
  const [state, formAction, pending] = useActionState(createOrganization, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Company name">
        <Input name="orgName" required placeholder="Acme Traders Pvt Ltd" />
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
      <Field label="Owner name">
        <Input name="ownerName" required placeholder="Full name" />
      </Field>
      <Field label="Owner email">
        <Input name="ownerEmail" type="email" required placeholder="owner@company.com" />
      </Field>
      {state.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}
      {state.tempPassword && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Company created. Owner login: <span className="font-semibold">temp password (shown once)</span>{" "}
          <span className="font-mono font-semibold">{state.tempPassword}</span>
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating..." : "Create company"}
      </Button>
    </form>
  );
}
