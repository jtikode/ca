"use client";

import { useActionState } from "react";
import { login, type ActionResult } from "@/actions/authActions";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const initialState: ActionResult = { ok: false, error: undefined };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Email">
        <Input name="email" type="email" required placeholder="you@company.com" />
      </Field>
      <Field label="Password">
        <Input name="password" type="password" required placeholder="••••••••" />
      </Field>
      {state.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
