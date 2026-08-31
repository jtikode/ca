import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { SalaryStructureForm } from "@/components/employees/SalaryStructureForm";
import { TaxDeclarationForm } from "@/components/employees/TaxDeclarationForm";
import { EmployeeDetailsForm } from "@/components/employees/EmployeeDetailsForm";
import { currentFinancialYear } from "@/lib/dates";
import { calculateGratuity } from "@/lib/statutory";

const EMPLOYMENT_STAGE_LABELS: Record<string, string> = { PROBATION: "Probation", CONFIRMED: "Confirmed" };
const EMPLOYMENT_BASIS_LABELS: Record<string, string> = { PERMANENT: "Permanent", CONTRACT: "Contract" };
const EMPLOYEE_CATEGORY_LABELS: Record<string, string> = { NON_MANAGERIAL: "Non-managerial", MANAGERIAL: "Managerial" };

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession(["SUPERADMIN", "HR_MANAGER"]);

  const employee = await db.employee.findFirst({
    where: { id, orgId: session.orgId },
    include: {
      salaryStructures: { orderBy: { effectiveFrom: "desc" } },
      loginUser: { select: { email: true } },
    },
  });

  if (!employee) notFound();

  const financialYear = currentFinancialYear();
  const [taxDeclaration, pendingSalaryRequests, leavePolicy, org] = await Promise.all([
    db.taxDeclaration.findUnique({
      where: { employeeId_financialYear: { employeeId: id, financialYear } },
    }),
    db.approvalRequest.findMany({
      where: { orgId: session.orgId, type: "UPDATE_SALARY", status: "PENDING" },
    }),
    db.leavePolicy.findUnique({ where: { orgId: session.orgId } }),
    db.organization.findUniqueOrThrow({ where: { id: session.orgId }, select: { multiLocationEnabled: true } }),
  ]);
  const stores = org.multiLocationEnabled
    ? await db.store.findMany({ where: { orgId: session.orgId }, orderBy: { name: "asc" } })
    : [];
  const hasPendingSalaryRequest = pendingSalaryRequests.some(
    (req) => (req.payload as { employeeId?: string }).employeeId === id,
  );

  const latest = employee.salaryStructures[0];
  const gratuity = latest ? calculateGratuity(Number(latest.basic), employee.doj) : null;
  const totalLeave = leavePolicy
    ? leavePolicy.casualLeavePerYear + leavePolicy.sickLeavePerYear + leavePolicy.earnedLeavePerYear
    : null;
  const canGenerateExitLetters = Boolean(employee.dol);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">{employee.name}</h1>
        <p className="text-sm text-slate-400">
          {employee.employeeCode} · {employee.state} · Joined {employee.doj.toLocaleDateString("en-IN")}
          {employee.designation ? ` · ${employee.designation}` : ""}
        </p>
        <p className="mt-1 text-sm text-slate-400">
          {EMPLOYMENT_STAGE_LABELS[employee.employmentStage]} · {EMPLOYMENT_BASIS_LABELS[employee.employmentBasis]} ·{" "}
          {EMPLOYEE_CATEGORY_LABELS[employee.employeeCategory]}
        </p>
        <p className="mt-1 text-sm text-slate-400">
          {employee.loginUser ? (
            <>Self-service login: {employee.loginUser.email}</>
          ) : (
            <>
              No self-service login yet — create one from the{" "}
              <a href="/team" className="font-semibold text-amber-400 hover:underline">
                Team page
              </a>
              .
            </>
          )}
        </p>
      </div>

      <Card>
        <h2 className="mb-1 text-lg font-bold text-white">Employee details</h2>
        <p className="mb-4 text-sm text-slate-400">
          Designation, employment classification, and PT applicability — used on HR documents below.
        </p>
        <EmployeeDetailsForm
          employeeId={employee.id}
          basic={latest ? Number(latest.basic) : 0}
          multiLocationEnabled={org.multiLocationEnabled}
          stores={stores}
          defaults={{
            designation: employee.designation ?? "",
            employmentStage: employee.employmentStage,
            probationEndDate: employee.probationEndDate,
            employmentBasis: employee.employmentBasis,
            employeeCategory: employee.employeeCategory,
            ptApplicable: employee.ptApplicable,
            pfApplicable: employee.pfApplicable,
            esiApplicable: employee.esiApplicable,
            dol: employee.dol,
            esiNumber: employee.esiNumber ?? "",
            mlwfIdNumber: employee.mlwfIdNumber ?? "",
            payMode: employee.payMode,
            shiftHoursPerDay: employee.shiftHoursPerDay ? Number(employee.shiftHoursPerDay) : null,
            freeLeaveDaysPerMonth: employee.freeLeaveDaysPerMonth,
            excessLeaveDailyDeduction: employee.excessLeaveDailyDeduction
              ? Number(employee.excessLeaveDailyDeduction)
              : null,
            wageRateType: employee.wageRateType,
            wageRate: employee.wageRate ? Number(employee.wageRate) : null,
            storeId: employee.storeId,
          }}
        />
      </Card>

      <Card>
        <h2 className="mb-1 text-lg font-bold text-white">Salary structure</h2>
        <p className="mb-4 text-sm text-slate-400">
          Saving creates a new revision effective today; past payroll runs keep referencing the structure that was
          in force at the time.
        </p>
        {hasPendingSalaryRequest && (
          <p className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-400">
            A salary change for this employee is pending superadmin approval.
          </p>
        )}
        {latest && (
          <SalaryStructureForm
            employeeId={employee.id}
            defaults={{
              basic: Number(latest.basic),
              hra: Number(latest.hra),
              da: Number(latest.da),
              conveyance: Number(latest.conveyance),
              medicalAllowance: Number(latest.medicalAllowance),
              specialAllowance: Number(latest.specialAllowance),
              otherAllowances:
                (latest.otherAllowances as unknown as { name: string; amount: number; basis: "FIXED" | "ATTENDANCE" }[] | null) ??
                [],
            }}
          />
        )}
      </Card>

      <Card>
        <h2 className="mb-1 text-lg font-bold text-white">Tax declaration</h2>
        <p className="mb-4 text-sm text-slate-400">Used to estimate monthly TDS for financial year {financialYear}.</p>
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

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Card>
          <h2 className="mb-1 text-lg font-bold text-white">Leave entitlement</h2>
          <p className="mb-4 text-sm text-slate-400">
            Your company&apos;s leave policy (editable in Settings) — an annual entitlement, not a running balance
            (leave taken isn&apos;t tracked yet).
          </p>
          {leavePolicy ? (
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Casual leave</span>
                <span className="font-semibold text-white">{leavePolicy.casualLeavePerYear} days/year</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sick leave</span>
                <span className="font-semibold text-white">{leavePolicy.sickLeavePerYear} days/year</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Earned leave</span>
                <span className="font-semibold text-white">{leavePolicy.earnedLeavePerYear} days/year</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-1">
                <span className="font-semibold text-white">Total</span>
                <span className="font-semibold text-white">{totalLeave} days/year</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No leave policy configured for {employee.state}.</p>
          )}
        </Card>

        <Card>
          <h2 className="mb-1 text-lg font-bold text-white">Gratuity</h2>
          <p className="mb-4 text-sm text-slate-400">
            Payment of Gratuity Act, 1972 — computed on Basic only (a known simplification; the Act technically
            includes DA too). Payable after 5 years of continuous service.
          </p>
          {gratuity ? (
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Completed years</span>
                <span className="font-semibold text-white">{gratuity.completedYears}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Accrued amount</span>
                <span className="font-semibold text-white">
                  ₹{gratuity.accruedAmount.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-1">
                <span className="font-semibold text-white">Eligibility</span>
                <span className="font-semibold text-white">
                  {gratuity.daysUntilEligible === null
                    ? `Eligible since ${gratuity.eligibleAt.toLocaleDateString("en-IN")}`
                    : `${gratuity.daysUntilEligible} days pending`}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Add a salary structure to compute gratuity.</p>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-1 text-lg font-bold text-white">HR documents</h2>
        <p className="mb-4 text-sm text-slate-400">
          Indicative templates — review for legal accuracy before issuing. Each PDF carries this disclaimer.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/api/employees/${employee.id}/letters/offer`}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            Offer letter
          </Link>
          <Link
            href={`/api/employees/${employee.id}/letters/appointment`}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            Appointment letter
          </Link>
          {canGenerateExitLetters ? (
            <>
              <Link
                href={`/api/employees/${employee.id}/letters/experience`}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
              >
                Experience letter
              </Link>
              <Link
                href={`/api/employees/${employee.id}/letters/relieving`}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
              >
                Relieving letter
              </Link>
            </>
          ) : (
            <span className="self-center text-sm text-slate-400">
              Set a date of leaving above to generate experience and relieving letters.
            </span>
          )}
        </div>
      </Card>

      {employee.salaryStructures.length > 1 && (
        <Card className="overflow-x-auto">
          <h2 className="mb-4 text-lg font-bold text-white">Salary history</h2>
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-4">Effective from</th>
                <th className="py-2 pr-4">Basic</th>
                <th className="py-2 pr-4">HRA</th>
                <th className="py-2 pr-4">Conveyance</th>
                <th className="py-2 pr-4">Special allowance</th>
              </tr>
            </thead>
            <tbody>
              {employee.salaryStructures.map((s) => (
                <tr key={s.id} className="border-b border-slate-800 text-slate-300">
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
