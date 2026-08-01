"use client";

import { useActionState } from "react";
import { platformLogin, type ActionResult } from "@/actions/platformActions";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const initialState: ActionResult = { ok: false, error: undefined };

export function PlatformLoginForm() {
  const [state, formAction, pending] = useActionState(platformLogin, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Email">
        <Input name="email" type="email" required placeholder="you@company.com" />
      </Field>
      <Field label="Password">
        <Input name="password" type="password" required placeholder="••••••••" />
      </Field>
      {state.error && <p className="text-sm font-medium text-red-400">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full bg-slate-700 hover:bg-slate-800">
        {pending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
