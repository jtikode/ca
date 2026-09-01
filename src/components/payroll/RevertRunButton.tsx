"use client";

import { useState, useTransition } from "react";
import { revertPayrollRunToDraft } from "@/actions/payrollActions";
import { Button } from "@/components/ui/Button";

export function RevertRunButton({ payrollRunId, finalizedAt }: { payrollRunId: string; finalizedAt: Date }) {
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="text-sm font-semibold text-red-400 hover:underline"
      >
        Revert to draft
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
      <p className="mb-2">
        This run was finalized on {finalizedAt.toLocaleDateString("en-IN")}. Reverting it lets you edit it again —
        any payslips already downloaded or emailed are now out of date until you re-finalize.
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await revertPayrollRunToDraft(payrollRunId);
              if (!result.ok) setError(result.error);
            })
          }
        >
          {pending ? "Reverting..." : "Yes, revert to draft"}
        </Button>
        <button type="button" onClick={() => setArmed(false)} className="text-sm font-semibold hover:underline">
          Cancel
        </button>
      </div>
      {error && <p className="mt-2 font-medium">{error}</p>}
    </div>
  );
}
