"use client";

import { useActionState } from "react";
import { updateDaysPaid, type ActionResult } from "@/actions/payrollActions";

const initialState: ActionResult = { ok: false, error: undefined };

export function DaysPaidCell({
  payrollRunId,
  employeeId,
  daysPaid,
  daysInMonth,
  editable,
}: {
  payrollRunId: string;
  employeeId: string;
  daysPaid: number;
  daysInMonth: number;
  editable: boolean;
}) {
  const action = updateDaysPaid.bind(null, payrollRunId, employeeId);
  const [state, formAction, pending] = useActionState(action, initialState);

  if (!editable) {
    return (
      <span>
        {daysPaid} / {daysInMonth}
      </span>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-1">
      <input
        type="number"
        name="daysPaid"
        defaultValue={daysPaid}
        min={0}
        max={daysInMonth}
        step="0.5"
        className="h-8 w-16 rounded border border-slate-700 bg-slate-900 px-2 text-sm text-white"
      />
      <span className="text-slate-400">/ {daysInMonth}</span>
      <button
        type="submit"
        disabled={pending}
        className="text-xs font-semibold text-amber-400 hover:underline disabled:opacity-50"
      >
        {pending ? "..." : "Update"}
      </button>
      {state.error && <span className="text-xs text-red-400">{state.error}</span>}
    </form>
  );
}
