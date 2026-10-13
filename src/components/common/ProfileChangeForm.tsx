"use client";

import { useActionState } from "react";
import { submitProfileChange } from "@/actions/profileActions";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function ProfileChangeForm({
  current,
  disabled,
}: {
  current: { email: string; dob: string; pan: string; uan: string; bankAccountNo: string; bankIfsc: string };
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState(submitProfileChange, { ok: false } as { ok: boolean; error?: string; values?: Record<string, string> });

  // After a validation error the form is reset by React, so refill it from
  // what was typed instead of the saved values.
  const v = (name: keyof typeof current) => state.values?.[name] ?? current[name];

  return (
    <form key={state.values ? "retry" : "fresh"} action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Field label="Email">
        <Input name="email" type="email" defaultValue={v("email")} />
      </Field>
      <Field label="Date of birth">
        <Input name="dob" type="date" defaultValue={v("dob")} />
      </Field>
      <Field label="PAN">
        <Input name="pan" defaultValue={v("pan")} placeholder="ABCDE1234F" maxLength={10} />
      </Field>
      <Field label="UAN (12 digits)">
        <Input name="uan" defaultValue={v("uan")} maxLength={12} />
      </Field>
      <Field label="Bank account number">
        <Input name="bankAccountNo" defaultValue={v("bankAccountNo")} />
      </Field>
      <Field label="Bank IFSC">
        <Input name="bankIfsc" defaultValue={v("bankIfsc")} placeholder="HDFC0001234" maxLength={11} />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending || disabled}>
          {pending ? "Sending..." : "Send changes to HR"}
        </Button>
        {disabled && <p className="mt-2 text-sm text-amber-400">You have a change waiting for HR review.</p>}
        {state.error && <p className="mt-2 text-sm font-medium text-red-400">{state.error}</p>}
        {state.ok && <p className="mt-2 text-sm font-medium text-emerald-400">Sent. HR will review it.</p>}
      </div>
    </form>
  );
}
