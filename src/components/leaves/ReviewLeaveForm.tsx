"use client";

import { useActionState } from "react";
import { reviewLeaveRequest, type ActionResult } from "@/actions/leaveActions";

const initialState: ActionResult = { ok: false, error: undefined };

export function ReviewLeaveForm({ requestId }: { requestId: string }) {
  const action = reviewLeaveRequest.bind(null, requestId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        name="reviewNote"
        placeholder="Note (optional)"
        className="h-8 w-32 rounded border border-slate-700 bg-slate-900 px-2 text-xs text-white placeholder-slate-500"
      />
      <button
        type="submit"
        name="decision"
        value="APPROVED"
        disabled={pending}
        className="text-xs font-semibold text-emerald-400 hover:underline disabled:opacity-50"
      >
        Approve
      </button>
      <button
        type="submit"
        name="decision"
        value="REJECTED"
        disabled={pending}
        className="text-xs font-semibold text-red-400 hover:underline disabled:opacity-50"
      >
        Reject
      </button>
      {state.error && <span className="w-full text-xs text-red-400">{state.error}</span>}
    </form>
  );
}
