"use client";

import { useActionState, useState } from "react";
import { updateEmployeeDetails, type ActionResult } from "@/actions/employeeActions";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const initialState: ActionResult = { ok: false };

function toDateInputValue(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

function daysInCurrentMonth(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

export function EmployeeDetailsForm({
  employeeId,
  defaults,
  basic,
}: {
  employeeId: string;
  defaults: {
    designation: string;
    employmentStage: string;
    probationEndDate: Date | null;
    employmentBasis: string;
    employeeCategory: string;
    ptApplicable: boolean;
    pfApplicable: boolean;
    esiApplicable: boolean;
    dol: Date | null;
    esiNumber: string;
    mlwfIdNumber: string;
    payMode: string;
    shiftHoursPerDay: number | null;
    freeLeaveDaysPerMonth: number | null;
    excessLeaveDailyDeduction: number | null;
    wageRateType: string | null;
    wageRate: number | null;
  };
  /** Current Basic, used to auto-suggest excessLeaveDailyDeduction when the
   * hourly toggle is first switched on. */
  basic: number;
}) {
  const action = updateEmployeeDetails.bind(null, employeeId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [payMode, setPayMode] = useState(defaults.payMode);
  const [excessLeaveDailyDeduction, setExcessLeaveDailyDeduction] = useState(
    defaults.excessLeaveDailyDeduction != null ? String(defaults.excessLeaveDailyDeduction) : "",
  );
  const [pfApplicable, setPfApplicable] = useState(defaults.pfApplicable);
  const [esiApplicable, setEsiApplicable] = useState(defaults.esiApplicable);
  const [ptApplicable, setPtApplicable] = useState(defaults.ptApplicable);

  function handlePayModeChange(next: string) {
    setPayMode(next);
    if (next === "HOURLY_ATTENDANCE" && excessLeaveDailyDeduction === "") {
      const suggestion = Math.round(basic / daysInCurrentMonth());
      setExcessLeaveDailyDeduction(String(suggestion));
    }
    if (next === "WAGE_BASED") {
      // One-time default when switching to wage-based pay — casual/wage
      // workers commonly aren't covered by PF/ESI/PT the same way salaried
      // staff are, but this is just a starting point HR can still override.
      setPfApplicable(false);
      setEsiApplicable(false);
      setPtApplicable(false);
    }
  }

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Designation">
        <Input name="designation" defaultValue={defaults.designation} placeholder="e.g. Sales Executive" />
      </Field>
      <Field label="Employment stage">
        <Select name="employmentStage" defaultValue={defaults.employmentStage}>
          <option value="PROBATION">Probation</option>
          <option value="CONFIRMED">Confirmed</option>
        </Select>
      </Field>
      <Field label="Probation end date">
        <Input name="probationEndDate" type="date" defaultValue={toDateInputValue(defaults.probationEndDate)} />
      </Field>
      <Field label="Employment basis">
        <Select name="employmentBasis" defaultValue={defaults.employmentBasis}>
          <option value="PERMANENT">Permanent</option>
          <option value="CONTRACT">Contract</option>
        </Select>
      </Field>
      <Field label="Category">
        <Select name="employeeCategory" defaultValue={defaults.employeeCategory}>
          <option value="NON_MANAGERIAL">Non-managerial</option>
          <option value="MANAGERIAL">Managerial</option>
        </Select>
      </Field>
      <Field label="Date of leaving">
        <Input name="dol" type="date" defaultValue={toDateInputValue(defaults.dol)} />
      </Field>
      <Field label="ESIC IP Number">
        <Input name="esiNumber" defaultValue={defaults.esiNumber} />
      </Field>
      <Field label="MLWF Labour ID Number">
        <Input name="mlwfIdNumber" defaultValue={defaults.mlwfIdNumber} />
      </Field>

      <div className="col-span-full flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="pfApplicable"
            checked={pfApplicable}
            onChange={(e) => setPfApplicable(e.target.checked)}
            className="h-4 w-4"
          />
          PF applicable
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="esiApplicable"
            checked={esiApplicable}
            onChange={(e) => setEsiApplicable(e.target.checked)}
            className="h-4 w-4"
          />
          ESI applicable
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="ptApplicable"
            checked={ptApplicable}
            onChange={(e) => setPtApplicable(e.target.checked)}
            className="h-4 w-4"
          />
          Professional Tax applicable
        </label>
      </div>

      <Field label="Pay mode">
        <Select name="payMode" value={payMode} onChange={(e) => handlePayModeChange(e.target.value)}>
          <option value="MONTHLY">Monthly (standard)</option>
          <option value="HOURLY_ATTENDANCE">Hourly / attendance-based</option>
          <option value="WAGE_BASED">Wage-based (hourly/daily)</option>
        </Select>
      </Field>

      {payMode === "HOURLY_ATTENDANCE" && (
        <>
          <Field label="Shift hours/day">
            <Input
              name="shiftHoursPerDay"
              type="number"
              min="0"
              step="0.5"
              defaultValue={defaults.shiftHoursPerDay ?? ""}
              placeholder="e.g. 5"
            />
          </Field>
          <Field label="Free leave days/month">
            <Input
              name="freeLeaveDaysPerMonth"
              type="number"
              min="0"
              step="1"
              defaultValue={defaults.freeLeaveDaysPerMonth ?? ""}
              placeholder="e.g. 2"
            />
          </Field>
          <Field label="Cutting rate/excess day (₹)">
            <Input
              name="excessLeaveDailyDeduction"
              type="number"
              min="0"
              step="1"
              value={excessLeaveDailyDeduction}
              onChange={(e) => setExcessLeaveDailyDeduction(e.target.value)}
            />
          </Field>
          <p className="col-span-full text-xs text-slate-500">
            Absences up to the free-leave allowance don&apos;t reduce pay. Beyond that, this rate is deducted from
            Basic per excess day — suggested from Basic ÷ days in month, editable per employee.
          </p>
        </>
      )}

      {payMode === "WAGE_BASED" && (
        <>
          <Field label="Wage rate type">
            <Select name="wageRateType" defaultValue={defaults.wageRateType ?? "DAILY"}>
              <option value="DAILY">Daily</option>
              <option value="HOURLY">Hourly</option>
            </Select>
          </Field>
          <Field label="Wage rate (₹)">
            <Input
              name="wageRate"
              type="number"
              min="0"
              step="1"
              defaultValue={defaults.wageRate ?? ""}
              placeholder="e.g. 500"
            />
          </Field>
          <p className="col-span-full text-xs text-slate-500">
            No fixed monthly salary — pay each run is this rate × days (or hours) actually worked, from
            uploaded attendance. PF/ESI/PT default to off above but can be re-enabled if this employee&apos;s
            arrangement requires them.
          </p>
        </>
      )}

      <div className="col-span-full flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save details"}
        </Button>
        {state.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}
        {state.ok && <p className="text-sm font-medium text-green-700">Saved.</p>}
      </div>
      <p className="col-span-full text-xs text-slate-500">
        Set date of leaving to enable the experience and relieving letters below.
      </p>
    </form>
  );
}
