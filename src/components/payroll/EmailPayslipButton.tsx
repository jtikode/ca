"use client";

import { useState, useTransition } from "react";
import { sendPayslipEmail } from "@/actions/payslipEmailActions";

export function EmailPayslipButton({ payrollRunId, employeeId }: { payrollRunId: string; employeeId: string }) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  function handleClick() {
    startTransition(async () => {
      const result = await sendPayslipEmail(payrollRunId, employeeId);
      setStatus(
        result.ok
          ? { ok: true, message: `Sent to ${result.sentTo}` }
          : { ok: false, message: result.error ?? "Failed to send." },
      );
    });
  }

  return (
    <div className="flex flex-col items-start gap-0.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="text-sm font-semibold text-amber-400 hover:underline disabled:opacity-50"
      >
        {isPending ? "Sending..." : "Email"}
      </button>
      {status && (
        <span className={`text-xs ${status.ok ? "text-emerald-400" : "text-red-400"}`}>{status.message}</span>
      )}
    </div>
  );
}
