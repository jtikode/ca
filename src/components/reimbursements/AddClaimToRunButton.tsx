"use client";

import { useState, useTransition } from "react";
import { addReimbursementToPayrollRun } from "@/actions/reimbursementActions";

export function AddClaimToRunButton({
  claimId,
  payrollRunId,
  runLabel,
}: {
  claimId: string;
  payrollRunId: string;
  runLabel: string;
}) {
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await addReimbursementToPayrollRun(claimId, payrollRunId);
            if (!result.ok) setError(result.error);
          })
        }
        className="text-xs font-semibold text-amber-400 hover:underline disabled:opacity-50"
      >
        {pending ? "Adding..." : `Add to ${runLabel} draft`}
      </button>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
