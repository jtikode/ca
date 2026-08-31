"use client";

import { useActionState } from "react";
import { addStore, type ActionResult } from "@/actions/storeActions";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const initialState: ActionResult = { ok: false, error: undefined };

export function StoreForm() {
  const [state, formAction, pending] = useActionState(addStore, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <Field label="Store name">
        <Input name="name" required className="w-56" placeholder="e.g. Andheri Branch" />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding..." : "Add store"}
      </Button>
      {state.error && <p className="text-sm font-medium text-red-400">{state.error}</p>}
      {state.ok && <p className="text-sm font-medium text-emerald-400">Added.</p>}
    </form>
  );
}
