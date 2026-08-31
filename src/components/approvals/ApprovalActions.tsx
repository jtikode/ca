"use client";

import { useActionState } from "react";
import { approveRequest, rejectRequest, type ActionResult } from "@/actions/approvalActions";
import { Button } from "@/components/ui/Button";

const initialState: ActionResult = { ok: false };

export function ApprovalActions({ requestId }: { requestId: string }) {
  const approveAction = async () => approveRequest(requestId);
  const rejectAction = async () => rejectRequest(requestId);

  const [approveState, submitApprove, approving] = useActionState(approveAction, initialState);
  const [rejectState, submitReject, rejecting] = useActionState(rejectAction, initialState);

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <form action={submitReject}>
          <Button type="submit" variant="outline" disabled={rejecting || approving}>
            {rejecting ? "..." : "Reject"}
          </Button>
        </form>
        <form action={submitApprove}>
          <Button type="submit" disabled={approving || rejecting}>
            {approving ? "..." : "Approve"}
          </Button>
        </form>
      </div>
      {approveState.error && <p className="text-xs font-medium text-red-400">{approveState.error}</p>}
      {rejectState.error && <p className="text-xs font-medium text-red-400">{rejectState.error}</p>}
    </div>
  );
}
