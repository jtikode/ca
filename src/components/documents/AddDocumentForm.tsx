"use client";

import { useActionState, useState } from "react";
import { addDocument, type ActionResult } from "@/actions/documentActions";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { DOCUMENT_CATEGORIES } from "@/lib/validators";

const CATEGORY_LABELS: Record<(typeof DOCUMENT_CATEGORIES)[number], string> = {
  TRAINING: "Training material",
  CHECKLIST: "Checklist",
  DOCUMENT: "Document",
};

const initialState: ActionResult = { ok: false, error: undefined };

export function AddDocumentForm({
  employees,
}: {
  employees: { id: string; name: string; employeeCode: string }[];
}) {
  const [state, formAction, pending] = useActionState(addDocument, initialState);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allSelected = employees.length > 0 && selected.size === employees.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(employees.map((e) => e.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Title">
          <Input name="title" required placeholder="e.g. Fire Safety Training" />
        </Field>
        <Field label="Category">
          <Select name="category" defaultValue="DOCUMENT">
            {DOCUMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Link URL">
          <Input name="url" type="url" required placeholder="https://drive.google.com/..." />
        </Field>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-300">Visible to</p>
          {employees.length > 0 && (
            <button type="button" onClick={toggleAll} className="text-xs font-semibold text-amber-400 hover:underline">
              {allSelected ? "Clear all" : "Select all"}
            </button>
          )}
        </div>
        {employees.length === 0 ? (
          <p className="text-sm text-slate-500">No active employees yet.</p>
        ) : (
          <div className="grid max-h-48 grid-cols-1 gap-1.5 overflow-y-auto rounded-lg border border-slate-800 p-3 sm:grid-cols-2">
            {employees.map((e) => (
              <label key={e.id} className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  name="employeeIds"
                  value={e.id}
                  checked={selected.has(e.id)}
                  onChange={() => toggleOne(e.id)}
                  className="h-4 w-4"
                />
                {e.name} ({e.employeeCode})
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Adding..." : "Add document"}
        </Button>
        {state.error && <p className="text-sm font-medium text-red-400">{state.error}</p>}
        {state.ok && <p className="text-sm font-medium text-emerald-400">Added.</p>}
      </div>
    </form>
  );
}
