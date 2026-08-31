"use client";

import { useActionState } from "react";
import { inviteHrManager, type InviteResult } from "@/actions/userActions";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const initialState: InviteResult = { ok: false };

export function InviteHrManagerForm({
  multiLocationEnabled = false,
  stores = [],
}: {
  multiLocationEnabled?: boolean;
  stores?: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(inviteHrManager, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <Field label="Name">
        <Input name="name" required className="w-48" />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" required className="w-64" />
      </Field>
      {multiLocationEnabled && (
        <Field label="Store">
          <Select name="storeId" className="w-48">
            <option value="">— No store —</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Inviting..." : "Invite HR manager"}
      </Button>
      {state.error && <p className="text-sm font-medium text-red-400">{state.error}</p>}
      {state.tempPassword && (
        <p className="w-full rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Account created. Temporary password (shown once):{" "}
          <span className="font-mono font-semibold">{state.tempPassword}</span>
        </p>
      )}
    </form>
  );
}
