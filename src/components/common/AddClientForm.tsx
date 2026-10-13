"use client";

import { useActionState } from "react";
import { createClientOrganization } from "@/actions/clientActions";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { SUPPORTED_STATES } from "@/lib/validators";

export function AddClientForm() {
  const [state, action, pending] = useActionState(createClientOrganization, { ok: false } as { ok: boolean; error?: string });
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <Field label="Client company name">
        <Input name="name" required className="w-64" placeholder="Acme Traders Pvt Ltd" />
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
      <Button type="submit" disabled={pending}>
        {pending ? "Adding..." : "Add client company"}
      </Button>
      {state.error && <p className="w-full text-sm font-medium text-red-400">{state.error}</p>}
    </form>
  );
}
