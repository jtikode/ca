"use client";

import { useActionState, useState } from "react";
import { addCertificate, type ActionResult } from "@/actions/certificateActions";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { CERTIFICATE_CATEGORIES, CERTIFICATE_CATEGORY_LABELS as CATEGORY_LABELS } from "@/lib/validators";

const initialState: ActionResult = { ok: false, error: undefined };

export function CertificateForm() {
  const [state, formAction, pending] = useActionState(addCertificate, initialState);
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);

  // Picking a preset category prefills a sensible name — still fully
  // editable, and choosing "Other / custom" leaves the name exactly as the
  // admin typed it, same as before this feature existed.
  function onCategoryChange(category: string) {
    if (nameTouched) return;
    const preset = CATEGORY_LABELS[category as (typeof CERTIFICATE_CATEGORIES)[number]];
    if (preset && preset !== CATEGORY_LABELS.OTHER) setName(preset);
  }

  return (
    <form action={formAction} encType="multipart/form-data" className="flex flex-wrap items-end gap-3">
      <Field label="Category">
        <Select name="category" defaultValue="OTHER" onChange={(e) => onCategoryChange(e.target.value)}>
          {CERTIFICATE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Certificate name">
        <Input
          name="name"
          required
          className="w-56"
          placeholder="e.g. Trade License"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setNameTouched(true);
          }}
        />
      </Field>
      <Field label="Expiry date">
        <Input name="expiryDate" type="date" required />
      </Field>
      <Field label="Photo/scan (optional, under 1MB)">
        <input
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="block w-56 text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-slate-700"
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding..." : "Add certificate"}
      </Button>
      {state.error && <p className="w-full text-sm font-medium text-red-400">{state.error}</p>}
      {state.ok && <p className="w-full text-sm font-medium text-emerald-400">Added.</p>}
    </form>
  );
}
