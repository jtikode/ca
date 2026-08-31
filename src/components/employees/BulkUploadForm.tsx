"use client";

import { useActionState } from "react";
import Link from "next/link";
import { bulkUploadEmployees, type BulkUploadResult } from "@/actions/employeeActions";
import { Button } from "@/components/ui/Button";

const initialState: BulkUploadResult = { ok: false };

export function BulkUploadForm() {
  const [state, formAction, pending] = useActionState(bulkUploadEmployees, initialState);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/api/employees/template"
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
        >
          Download template
        </Link>
        <form action={formAction} className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            name="file"
            accept=".xlsx"
            required
            className="text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-200 hover:file:bg-slate-700"
          />
          <Button type="submit" disabled={pending}>
            {pending ? "Uploading..." : "Upload"}
          </Button>
        </form>
      </div>

      {state.error && <p className="text-sm font-medium text-red-400">{state.error}</p>}
      {state.ok && state.createdCount != null && (
        <p className="text-sm font-medium text-emerald-400">{state.createdCount} employee(s) added.</p>
      )}
      {state.ok && state.pendingCount != null && (
        <p className="text-sm font-medium text-amber-400">
          {state.pendingCount} employee(s) submitted — awaiting superadmin approval.
        </p>
      )}
      {state.rowErrors && state.rowErrors.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-red-500/20">
          <table className="w-full min-w-[400px] text-left text-sm">
            <thead>
              <tr className="border-b border-red-500/20 bg-red-500/10 text-red-400">
                <th className="py-2 pl-3 pr-4">Row</th>
                <th className="py-2 pr-4">Problem</th>
              </tr>
            </thead>
            <tbody>
              {state.rowErrors.map((e, i) => (
                <tr key={i} className="border-b border-red-500/10">
                  <td className="py-2 pl-3 pr-4 text-slate-300">{e.row}</td>
                  <td className="py-2 pr-4 text-slate-300">{e.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
