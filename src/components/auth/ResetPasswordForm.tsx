"use client";

import { useActionState } from "react";
import { resetPassword, type ActionResult } from "@/actions/authActions";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const initialState: ActionResult = { ok: false, error: undefined };

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPassword, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <Field label="New password">
        <Input name="password" type="password" required placeholder="At least 8 characters" />
      </Field>
      <Field label="Confirm new password">
        <Input name="confirmPassword" type="password" required placeholder="Re-enter password" />
      </Field>
      {state.error && <p className="text-sm font-medium text-red-400">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Resetting..." : "Reset password"}
      </Button>
    </form>
  );
}
