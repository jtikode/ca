"use client";

import { useActionState } from "react";
import { createEmployeeLogin, type InviteResult } from "@/actions/userActions";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const initialState: InviteResult = { ok: false };

export function CreateEmployeeLoginForm({
  employees,
}: {
  employees: { id: string; name: string; employeeCode: string }[];
}) {
  const action = async (prevState: InviteResult | null, formData: FormData) => {
    const employeeId = formData.get("employeeId") as string;
    return createEmployeeLogin(employeeId, prevState, formData);
  };
  const [state, formAction, pending] = useActionState(action, initialState);

  if (employees.length === 0) {
    return <p className="text-sm text-slate-500">Every active employee already has a login.</p>;
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <Field label="Employee">
        <Select name="employeeId" required className="w-56">
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} ({e.employeeCode})
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Login email">
        <Input name="email" type="email" required className="w-64" />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create login"}
      </Button>
      {state.error && <p className="text-sm font-medium text-red-400">{state.error}</p>}
      {state.tempPassword && (
        <p className="w-full rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Login created. Temporary password (shown once):{" "}
          <span className="font-mono font-semibold">{state.tempPassword}</span>
        </p>
      )}
    </form>
  );
}
