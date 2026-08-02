"use client";

import { useActionState } from "react";
import { uploadAttendance, type AttendanceUploadResult } from "@/actions/attendanceActions";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { MONTH_NAMES } from "@/lib/dates";

const initialState: AttendanceUploadResult = { ok: false };
const now = new Date();

export function AttendanceUploadForm() {
  const [state, formAction, pending] = useActionState(uploadAttendance, initialState);

  return (
    <div className="space-y-3">
      <a
        href="/api/attendance/template"
        className="inline-block rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        Download template
      </a>
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <Field label="Month">
          <Select name="month" defaultValue={now.getMonth() + 1} required>
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Year">
          <Input name="year" type="number" defaultValue={now.getFullYear()} required className="w-28" />
        </Field>
        <input
          type="file"
          name="file"
          accept=".xlsx"
          required
          className="text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Uploading..." : "Upload attendance"}
        </Button>
      </form>

      {state.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}
      {state.ok && state.uploadedCount != null && (
        <p className="text-sm font-medium text-green-700">{state.uploadedCount} attendance row(s) saved.</p>
      )}
      {state.rowErrors && state.rowErrors.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-red-200">
          <table className="w-full min-w-[400px] text-left text-sm">
            <thead>
              <tr className="border-b border-red-200 bg-red-50 text-red-700">
                <th className="py-2 pl-3 pr-4">Row</th>
                <th className="py-2 pr-4">Problem</th>
              </tr>
            </thead>
            <tbody>
              {state.rowErrors.map((e, i) => (
                <tr key={i} className="border-b border-red-100">
                  <td className="py-2 pl-3 pr-4 text-slate-700">{e.row}</td>
                  <td className="py-2 pr-4 text-slate-700">{e.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
