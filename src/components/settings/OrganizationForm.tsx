"use client";

import { useActionState, useState } from "react";
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
    logoUrl: string;
    overtimeAutoCalculateEnabled: boolean;
    standardHoursPerDay: number;
    overtimeRateMultiplier: number;
    multiLocationEnabled: boolean;
  };
}) {
  const [state, formAction, pending] = useActionState(updateOrganization, initialState);
  const [overtimeEnabled, setOvertimeEnabled] = useState(defaults.overtimeAutoCalculateEnabled);

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
      <div className="col-span-full">
        <Field label="Company logo URL">
          <Input name="logoUrl" defaultValue={defaults.logoUrl} placeholder="https://drive.google.com/file/d/..." />
        </Field>
        <p className="mt-1 text-xs text-slate-500">
          Paste a public image link — appears next to your company name and on generated payslips/letters. For
          Google Drive: share the file with &quot;Anyone with the link&quot; as Viewer, then paste that link here;
          we convert it automatically.
        </p>
      </div>
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" name="pfApplicable" defaultChecked={defaults.pfApplicable} className="h-4 w-4" />
          PF applicable
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" name="esiApplicable" defaultChecked={defaults.esiApplicable} className="h-4 w-4" />
          ESI applicable
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            name="payslipEmailEnabled"
            defaultChecked={defaults.payslipEmailEnabled}
            className="h-4 w-4"
          />
          Auto-email payslips when a run is finalized
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            name="multiLocationEnabled"
            defaultChecked={defaults.multiLocationEnabled}
            className="h-4 w-4"
          />
          This company operates from multiple locations
        </label>
      </div>

      <div className="col-span-full space-y-3 rounded-lg border border-slate-800 p-3">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <input
            type="checkbox"
            name="overtimeAutoCalculateEnabled"
            checked={overtimeEnabled}
            onChange={(e) => setOvertimeEnabled(e.target.checked)}
            className="h-4 w-4"
          />
          Auto-calculate overtime pay from attendance hours worked
        </label>
        {overtimeEnabled && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Standard hours/day">
                <Input
                  name="standardHoursPerDay"
                  type="number"
                  min="1"
                  step="0.5"
                  defaultValue={defaults.standardHoursPerDay}
                />
              </Field>
              <Field label="Overtime rate multiplier">
                <Input
                  name="overtimeRateMultiplier"
                  type="number"
                  min="1"
                  step="0.5"
                  defaultValue={defaults.overtimeRateMultiplier}
                />
              </Field>
            </div>
            <p className="text-xs text-slate-500">
              Hours worked beyond the standard, per day (from uploaded attendance), are paid at this multiple of
              the employee&apos;s hourly rate and added to net pay. Indicative only — exact overtime rules vary by
              state and establishment type, so confirm with your CA before relying on this.
            </p>
          </>
        )}
      </div>

      <div className="col-span-full flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </Button>
        {state.error && <p className="text-sm font-medium text-red-400">{state.error}</p>}
        {state.ok && <p className="text-sm font-medium text-emerald-400">Saved.</p>}
      </div>
    </form>
  );
}
