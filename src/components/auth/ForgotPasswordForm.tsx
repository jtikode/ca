"use client";

import { useActionState } from "react";
import { requestPasswordReset, type ActionResult } from "@/actions/authActions";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const initialState: ActionResult = { ok: false, error: undefined };

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  if (state.ok) {
    return (
      <p className="text-sm text-slate-300">
        If an account exists for that email, we&apos;ve sent a link to reset the password. It expires in 1 hour.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Email">
        <Input name="email" type="email" required placeholder="you@company.com" />
      </Field>
      {state.error && <p className="text-sm font-medium text-red-400">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sending..." : "Send reset link"}
      </Button>
    </form>
  );
}
