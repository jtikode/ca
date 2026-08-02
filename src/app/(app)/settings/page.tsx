import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { OrganizationForm } from "@/components/settings/OrganizationForm";

export default async function SettingsPage() {
  const session = await requireSession(["SUPERADMIN", "HR_MANAGER"]);
  const org = await db.organization.findUniqueOrThrow({ where: { id: session.orgId } });
  const ptSlabs = await db.pTSlab.findMany({ orderBy: [{ state: "asc" }, { minGross: "asc" }] });
  const leavePolicies = await db.leavePolicy.findMany({ orderBy: { state: "asc" } });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Settings</h1>

      <Card>
        <h2 className="mb-4 text-lg font-bold text-slate-900">Company details</h2>
        <OrganizationForm
          defaults={{
            legalName: org.legalName ?? "",
            address: org.address ?? "",
            pan: org.pan ?? "",
            tan: org.tan ?? "",
            pfRegistrationNo: org.pfRegistrationNo ?? "",
            esiRegistrationNo: org.esiRegistrationNo ?? "",
            pfApplicable: org.pfApplicable,
            esiApplicable: org.esiApplicable,
          }}
        />
      </Card>

      <Card className="overflow-x-auto">
        <h2 className="mb-1 text-lg font-bold text-slate-900">Professional Tax slabs</h2>
        <p className="mb-4 text-sm text-slate-500">
          Pre-loaded for Maharashtra and Karnataka. Employees in other states get no PT deduction until a slab is
          added for their state.
        </p>
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 pr-4">State</th>
              <th className="py-2 pr-4">Gross range</th>
              <th className="py-2 pr-4">Monthly PT</th>
            </tr>
          </thead>
          <tbody>
            {ptSlabs.map((slab) => (
              <tr key={slab.id} className="border-b border-slate-100 text-slate-700">
                <td className="py-2 pr-4">{slab.state}</td>
                <td className="py-2 pr-4">
                  ₹{Number(slab.minGross).toLocaleString("en-IN")}
                  {slab.maxGross ? ` – ₹${Number(slab.maxGross).toLocaleString("en-IN")}` : "+"}
                </td>
                <td className="py-2 pr-4">₹{Number(slab.monthlyAmount).toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="overflow-x-auto">
        <h2 className="mb-1 text-lg font-bold text-slate-900">Leave policy</h2>
        <p className="mb-4 text-sm text-slate-500">
          Indicative statutory entitlement per state (Shops &amp; Establishments Act) — not a running balance.
          Verify against the current Act before relying on it.
        </p>
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 pr-4">State</th>
              <th className="py-2 pr-4">Casual leave</th>
              <th className="py-2 pr-4">Sick leave</th>
              <th className="py-2 pr-4">Earned leave</th>
              <th className="py-2 pr-4">Total</th>
            </tr>
          </thead>
          <tbody>
            {leavePolicies.map((policy) => (
              <tr key={policy.id} className="border-b border-slate-100 text-slate-700">
                <td className="py-2 pr-4">{policy.state}</td>
                <td className="py-2 pr-4">{policy.casualLeavePerYear} days/year</td>
                <td className="py-2 pr-4">{policy.sickLeavePerYear} days/year</td>
                <td className="py-2 pr-4">{policy.earnedLeavePerYear} days/year</td>
                <td className="py-2 pr-4 font-semibold text-slate-900">
                  {policy.casualLeavePerYear + policy.sickLeavePerYear + policy.earnedLeavePerYear} days/year
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
