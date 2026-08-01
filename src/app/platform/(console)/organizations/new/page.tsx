import { requirePlatformSession } from "@/lib/platformPermissions";
import { Card } from "@/components/ui/Card";
import { CreateOrganizationForm } from "@/components/platform/CreateOrganizationForm";

export default async function NewOrganizationPage() {
  await requirePlatformSession();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl font-bold text-slate-900">New company</h1>
      <Card>
        <CreateOrganizationForm />
      </Card>
    </div>
  );
}
