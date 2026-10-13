"use client";

import { switchOrganization } from "@/actions/clientActions";

export function OrgSwitcher({ orgs, currentOrgId }: { orgs: { id: string; name: string }[]; currentOrgId: string }) {
  return (
    <form action={switchOrganization}>
      <select
        name="orgId"
        defaultValue={currentOrgId}
        aria-label="Switch company"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-8 max-w-[11rem] rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs font-medium text-white"
      >
        {orgs.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </form>
  );
}
