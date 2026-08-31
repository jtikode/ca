"use client";

import { useActionState } from "react";
import { addCertificate, type ActionResult } from "@/actions/certificateActions";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const initialState: ActionResult = { ok: false, error: undefined };

export function CertificateForm() {
  const [state, formAction, pending] = useActionState(addCertificate, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <Field label="Certificate name">
        <Input name="name" required className="w-56" placeholder="e.g. Trade License" />
      </Field>
      <Field label="Expiry date">
        <Input name="expiryDate" type="date" required />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding..." : "Add certificate"}
      </Button>
      {state.error && <p className="text-sm font-medium text-red-400">{state.error}</p>}
      {state.ok && <p className="text-sm font-medium text-emerald-400">Added.</p>}
    </form>
  );
}
