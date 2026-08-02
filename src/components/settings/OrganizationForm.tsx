"use client";

import { useActionState } from "react";
import { updateOrganization, type ActionResult } from "@/actions/orgActions";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const initialState: ActionResult = { ok: false, error: undefined };

export function OrganizationForm({
  defaults,
}: {
  defaults: {
    legalName: string;
    address: string;
    pan: string;
    tan: string;
    pfRegistrationNo: string;
    esiRegistrationNo: string;
    pfApplicable: boolean;
    esiApplicable: boolean;
    payslipEmailEnabled: boolean;
  };
}) {
  const [state, formAction, pending] = useActionState(updateOrganization, initialState);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Field label="Legal name">
        <Input name="legalName" defaultValue={defaults.legalName} />
      </Field>
      <Field label="Address">
        <Input name="address" defaultValue={defaults.address} placeholder="Used on HR letters" />
      </Field>
      <Field label="PAN">
        <Input name="pan" defaultValue={defaults.pan} />
      </Field>
      <Field label="TAN">
        <Input name="tan" defaultValue={defaults.tan} />
      </Field>
      <Field label="PF registration no.">
        <Input name="pfRegistrationNo" defaultValue={defaults.pfRegistrationNo} />
      </Field>
      <Field label="ESI registration no.">
        <Input name="esiRegistrationNo" defaultValue={defaults.esiRegistrationNo} />
      </Field>
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="pfApplicable" defaultChecked={defaults.pfApplicable} className="h-4 w-4" />
          PF applicable
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="esiApplicable" defaultChecked={defaults.esiApplicable} className="h-4 w-4" />
          ESI applicable
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="payslipEmailEnabled"
            defaultChecked={defaults.payslipEmailEnabled}
            className="h-4 w-4"
          />
          Auto-email payslips when a run is finalized
        </label>
      </div>
      <div className="col-span-full flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </Button>
        {state.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}
        {state.ok && <p className="text-sm font-medium text-green-700">Saved.</p>}
      </div>
    </form>
  );
}
