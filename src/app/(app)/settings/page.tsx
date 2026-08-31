import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { OrganizationForm } from "@/components/settings/OrganizationForm";
import { LeavePolicyForm } from "@/components/settings/LeavePolicyForm";
import { CertificateForm } from "@/components/settings/CertificateForm";
import { StoreForm } from "@/components/settings/StoreForm";
import { leavePolicyDefaultsForState } from "@/lib/leavePolicyDefaults";
import { deleteCertificate } from "@/actions/certificateActions";
import { deleteStore } from "@/actions/storeActions";
import { Badge } from "@/components/ui/Badge";
import { daysUntil } from "@/lib/dates";

export default async function SettingsPage() {
  const session = await requireSession(["SUPERADMIN", "HR_MANAGER"]);
  const org = await db.organization.findUniqueOrThrow({ where: { id: session.orgId } });
  const ptSlabs = await db.pTSlab.findMany({ orderBy: [{ state: "asc" }, { minGross: "asc" }] });
  const leavePolicy = await db.leavePolicy.findUnique({ where: { orgId: session.orgId } });
  const leavePolicyDefaults = leavePolicy ?? leavePolicyDefaultsForState(org.state);
  const certificates = await db.certificate.findMany({
    where: { orgId: session.orgId },
    orderBy: { expiryDate: "asc" },
  });
  const stores = org.multiLocationEnabled
    ? await db.store.findMany({ where: { orgId: session.orgId }, orderBy: { name: "asc" } })
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Settings</h1>

      <Card>
        <h2 className="mb-4 text-lg font-bold text-white">Company details</h2>
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
            payslipEmailEnabled: org.payslipEmailEnabled,
            logoUrl: org.logoUrl ?? "",
            overtimeAutoCalculateEnabled: org.overtimeAutoCalculateEnabled,
            standardHoursPerDay: Number(org.standardHoursPerDay),
            overtimeRateMultiplier: Number(org.overtimeRateMultiplier),
            multiLocationEnabled: org.multiLocationEnabled,
          }}
        />
      </Card>

      {org.multiLocationEnabled && (
        <Card className="overflow-x-auto">
          <h2 className="mb-1 text-lg font-bold text-white">Locations</h2>
          <p className="mb-4 text-sm text-slate-400">
            Stores/centres employees and HR managers can be assigned to. Assignment is informational only — it
            doesn&apos;t restrict what anyone can see.
          </p>
          <StoreForm />
          {stores.length > 0 && (
            <table className="mt-4 w-full min-w-[300px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {stores.map((store) => (
                  <tr key={store.id} className="border-b border-slate-800 text-slate-300">
                    <td className="py-2 pr-4 font-medium text-white">{store.name}</td>
                    <td className="py-2 pr-4">
                      <form action={deleteStore.bind(null, store.id)}>
                        <button type="submit" className="text-sm font-semibold text-red-400 hover:underline">
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      <Card className="overflow-x-auto">
        <h2 className="mb-1 text-lg font-bold text-white">Certificates</h2>
        <p className="mb-4 text-sm text-slate-400">
          Company-level certificates and registrations — expiry reminders show up on the dashboard.
        </p>
        <CertificateForm />
        {certificates.length > 0 && (
          <table className="mt-4 w-full min-w-[400px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Expiry</th>
                <th className="py-2 pr-4"></th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {certificates.map((cert) => {
                const remaining = daysUntil(cert.expiryDate);
                return (
                  <tr key={cert.id} className="border-b border-slate-800 text-slate-300">
                    <td className="py-2 pr-4 font-medium text-white">{cert.name}</td>
                    <td className="py-2 pr-4">{cert.expiryDate.toLocaleDateString("en-IN")}</td>
                    <td className="py-2 pr-4">
                      <Badge tone={remaining <= 3 ? "danger" : remaining <= 10 ? "warning" : "success"}>
                        {remaining <= 0 ? "Expired" : `${remaining} day${remaining === 1 ? "" : "s"}`}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4">
                      <form action={deleteCertificate.bind(null, cert.id)}>
                        <button type="submit" className="text-sm font-semibold text-red-400 hover:underline">
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="overflow-x-auto">
        <h2 className="mb-1 text-lg font-bold text-white">Professional Tax slabs</h2>
        <p className="mb-4 text-sm text-slate-400">
          Pre-loaded for Maharashtra and Karnataka. Employees in other states get no PT deduction until a slab is
          added for their state.
        </p>
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="py-2 pr-4">State</th>
              <th className="py-2 pr-4">Gross range</th>
              <th className="py-2 pr-4">Monthly PT</th>
            </tr>
          </thead>
          <tbody>
            {ptSlabs.map((slab) => (
              <tr key={slab.id} className="border-b border-slate-800 text-slate-300">
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

      <Card>
        <h2 className="mb-1 text-lg font-bold text-white">Leave policy</h2>
        <p className="mb-4 text-sm text-slate-400">
          Your company&apos;s own leave entitlement — an annual figure, not a running balance. Started from
          {" "}{org.state}&apos;s typical defaults; edit freely to match your actual policy.
        </p>
        <LeavePolicyForm defaults={leavePolicyDefaults} />
      </Card>
    </div>
  );
}
