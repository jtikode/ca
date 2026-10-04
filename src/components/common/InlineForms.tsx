"use client";

import { useActionState, useRef, useEffect } from "react";
import { addHoliday } from "@/actions/holidayActions";
import { submitRegularization } from "@/actions/regularizationActions";
import { addAsset } from "@/actions/assetActions";
import { submitTicket, respondToTicket } from "@/actions/helpdeskActions";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

interface Result {
  ok: boolean;
  error?: string;
}
const initial: Result = { ok: false };

function Feedback({ state }: { state: Result }) {
  if (state.error) return <p className="w-full text-sm font-medium text-red-400">{state.error}</p>;
  if (state.ok) return <p className="w-full text-sm font-medium text-emerald-400">Saved.</p>;
  return null;
}

// Clears the form after a successful save so the next entry starts blank.
function useResetOnSuccess(state: Result) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return ref;
}

export function AddHolidayForm() {
  const [state, action, pending] = useActionState(addHoliday, initial);
  const ref = useResetOnSuccess(state);
  return (
    <form ref={ref} action={action} className="flex flex-wrap items-end gap-3">
      <Field label="Date">
        <Input name="date" type="date" required />
      </Field>
      <Field label="Holiday name">
        <Input name="name" required className="w-56" placeholder="e.g. Diwali" />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding..." : "Add holiday"}
      </Button>
      <Feedback state={state} />
    </form>
  );
}

export function RegularizationForm() {
  const [state, action, pending] = useActionState(submitRegularization, initial);
  const ref = useResetOnSuccess(state);
  return (
    <form ref={ref} action={action} className="flex flex-wrap items-end gap-3">
      <Field label="Date to correct">
        <Input name="date" type="date" required />
      </Field>
      <Field label="Correct status">
        <Select name="status" defaultValue="PRESENT">
          <option value="PRESENT">I was present</option>
          <option value="ABSENT">I was absent</option>
        </Select>
      </Field>
      <Field label="Reason">
        <Input name="reason" className="w-64" placeholder="e.g. Forgot to punch in" />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Sending..." : "Request correction"}
      </Button>
      <Feedback state={state} />
    </form>
  );
}

export function AddAssetForm() {
  const [state, action, pending] = useActionState(addAsset, initial);
  const ref = useResetOnSuccess(state);
  return (
    <form ref={ref} action={action} className="flex flex-wrap items-end gap-3">
      <Field label="Asset">
        <Input name="name" required className="w-56" placeholder="e.g. Dell laptop" />
      </Field>
      <Field label="Serial / tag (optional)">
        <Input name="serialNo" className="w-48" />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding..." : "Add asset"}
      </Button>
      <Feedback state={state} />
    </form>
  );
}

export function TicketForm() {
  const [state, action, pending] = useActionState(submitTicket, initial);
  const ref = useResetOnSuccess(state);
  return (
    <form ref={ref} action={action} className="grid grid-cols-1 gap-3">
      <Field label="Subject">
        <Input name="subject" required placeholder="e.g. Question about my payslip" />
      </Field>
      <Field label="Details">
        <textarea
          name="message"
          required
          rows={3}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
        />
      </Field>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Sending..." : "Send to HR"}
        </Button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function TicketResponseForm({ ticketId }: { ticketId: string }) {
  const [state, action, pending] = useActionState(respondToTicket.bind(null, ticketId), initial);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input
        name="response"
        required
        placeholder="Write a reply and resolve"
        className="h-9 w-72 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-white placeholder:text-slate-500"
      />
      <Button type="submit" disabled={pending} className="h-9">
        {pending ? "..." : "Reply & resolve"}
      </Button>
      {state.error && <span className="w-full text-xs text-red-400">{state.error}</span>}
    </form>
  );
}
