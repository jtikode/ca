import { notFound } from "next/navigation";
import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { SalaryStructureForm } from "@/components/employees/SalaryStructureForm";
import { TaxDeclarationForm } from "@/components/employees/TaxDeclarationForm";
import { currentFinancialYear } from "@/lib/dates";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();

  const employee = await db.employee.findFirst({
    where: { id, orgId: session.orgId },
    include: {
      salaryStructures: { orderBy: { effectiveFrom: "desc" } },
    },
  });

  if (!employee) notFound();

  const financialYear = currentFinancialYear();
  const taxDeclaration = await db.taxDeclaration.findUnique({
    where: { employeeId_financialYear: { employeeId: id, financialYear } },
  });

  const latest = employee.salaryStructures[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{employee.name}</h1>
        <p className="text-sm text-slate-500">
          {employee.employeeCode} · {employee.state} · Joined {employee.doj.toLocaleDateString("en-IN")}
        </p>
      </div>

      <Card>
        <h2 className="mb-1 text-lg font-bold text-slate-900">Salary structure</h2>
        <p className="mb-4 text-sm text-slate-500">
          Saving creates a new revision effective today; past payroll runs keep referencing the structure that was
          in force at the time.
        </p>
        {latest && (
          <SalaryStructureForm
            employeeId={employee.id}
            defaults={{
              basic: Number(latest.basic),
              hra: Number(latest.hra),
              conveyance: Number(latest.conveyance),
              medicalAllowance: Number(latest.medicalAllowance),
              specialAllowance: Number(latest.specialAllowance),
            }}
          />
        )}
      </Card>

      <Card>
        <h2 className="mb-1 text-lg font-bold text-slate-900">Tax declaration</h2>
        <p className="mb-4 text-sm text-slate-500">Used to estimate monthly TDS for financial year {financialYear}.</p>
        <TaxDeclarationForm
          employeeId={employee.id}
          financialYear={financialYear}
          defaults={
            taxDeclaration
              ? {
                  regime: taxDeclaration.regime,
                  section80C: Number(taxDeclaration.section80C),
                  section80D: Number(taxDeclaration.section80D),
                  hraRentPaid: Number(taxDeclaration.hraRentPaid),
                  homeLoanInterest: Number(taxDeclaration.homeLoanInterest),
                  otherIncome: Number(taxDeclaration.otherIncome),
                }
              : undefined
          }
        />
      </Card>

      {employee.salaryStructures.length > 1 && (
        <Card className="overflow-x-auto">
          <h2 className="mb-4 text-lg font-bold text-slate-900">Salary history</h2>
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-4">Effective from</th>
                <th className="py-2 pr-4">Basic</th>
                <th className="py-2 pr-4">HRA</th>
                <th className="py-2 pr-4">Conveyance</th>
                <th className="py-2 pr-4">Special allowance</th>
              </tr>
            </thead>
            <tbody>
              {employee.salaryStructures.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 text-slate-700">
                  <td className="py-2 pr-4">{s.effectiveFrom.toLocaleDateString("en-IN")}</td>
                  <td className="py-2 pr-4">₹{Number(s.basic).toLocaleString("en-IN")}</td>
                  <td className="py-2 pr-4">₹{Number(s.hra).toLocaleString("en-IN")}</td>
                  <td className="py-2 pr-4">₹{Number(s.conveyance).toLocaleString("en-IN")}</td>
                  <td className="py-2 pr-4">₹{Number(s.specialAllowance).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
