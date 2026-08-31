"use client";

import { useActionState } from "react";
import { signup, type ActionResult } from "@/actions/authActions";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { SUPPORTED_STATES } from "@/lib/validators";

const initialState: ActionResult = { ok: false, error: undefined };

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, initialState);

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
      <Field label="Your name">
        <Input name="name" required placeholder="Full name" />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" required placeholder="you@company.com" />
      </Field>
      <Field label="Password">
        <Input name="password" type="password" required placeholder="At least 8 characters" />
      </Field>
      {state.error && <p className="text-sm font-medium text-red-400">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}
