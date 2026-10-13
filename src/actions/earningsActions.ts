"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { assertSession } from "@/lib/permissions";
import { recomputeOneEmployeeLine } from "@/actions/payrollActions";
import {
  BONUS_DEFAULT_CEILING,
  BONUS_ELIGIBILITY_WAGE_LIMIT,
  BONUS_MAX_RATE,
  BONUS_MIN_RATE,
  bonusMonthsInFinancialYear,
  calculateBonus,
} from "@/lib/bonus";
import { calculateGratuity } from "@/lib/statutory";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

// Adds one EARNING to the org's current Draft run (excluded from the PF/ESI
// wage base, like every payroll adjustment). Skips silently when the same
// named adjustment is already there so a double click can't pay twice.
async function addEarningToDraft(
  orgId: string,
  employeeId: string,
  name: string,
  amount: number,
): Promise<"added" | "duplicate" | "no-draft" | "zero"> {
  if (amount <= 0) return "zero";
  const run = await db.payrollRun.findFirst({
    where: { orgId, status: "DRAFT" },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  if (!run) return "no-draft";

  const existing = await db.payrollAdjustment.findFirst({ where: { payrollRunId: run.id, employeeId, name } });
  if (existing) return "duplicate";

  await db.payrollAdjustment.create({ data: { payrollRunId: run.id, employeeId, name, amount, type: "EARNING" } });
  await recomputeOneEmployeeLine(run.id, employeeId, orgId);
  revalidatePath(`/payroll/${run.id}`);
  revalidatePath("/earnings");
  return "added";
}

function parseBonusInputs(formData: FormData) {
  const fy = String(formData.get("fy") ?? "");
  const rate = Number(formData.get("rate"));
  const ceiling = Number(formData.get("ceiling") ?? BONUS_DEFAULT_CEILING);
  if (!/^\d{4}-\d{2}$/.test(fy)) return null;
  if (!(rate >= BONUS_MIN_RATE && rate <= BONUS_MAX_RATE)) return null;
  if (!(ceiling > 0)) return null;
  return { fy, rate, ceiling };
}

async function bonusFor(orgId: string, employeeId: string, fy: string, rate: number, ceiling: number) {
  const employee = await db.employee.findFirst({
    where: { id: employeeId, orgId, status: "ACTIVE" },
    include: { salaryStructures: { orderBy: { effectiveFrom: "desc" }, take: 1 } },
  });
  const structure = employee?.salaryStructures[0];
  if (!employee || !structure) return null;
  const basicPlusDa = Number(structure.basic) + Number(structure.da);
  if (basicPlusDa > BONUS_ELIGIBILITY_WAGE_LIMIT) return null;
  const months = bonusMonthsInFinancialYear(fy, employee.doj, employee.dol);
  return { employee, amount: calculateBonus(basicPlusDa, months, rate, ceiling) };
}

export async function addBonusToDraft(employeeId: string, formData: FormData): Promise<void> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);
  const inputs = parseBonusInputs(formData);
  if (!inputs) return;

  const result = await bonusFor(session.orgId, employeeId, inputs.fy, inputs.rate, inputs.ceiling);
  if (!result) return;

  const outcome = await addEarningToDraft(session.orgId, employeeId, `Statutory bonus ${inputs.fy}`, result.amount);
  if (outcome === "added") {
    await recordAudit(session, "BONUS_ADDED", "Employee", `Added statutory bonus ${result.amount} (${inputs.rate}%) for ${result.employee.name}`, employeeId);
  }
}

export async function addAllBonusToDraft(formData: FormData): Promise<void> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);
  const inputs = parseBonusInputs(formData);
  if (!inputs) return;

  const employees = await db.employee.findMany({ where: { orgId: session.orgId, status: "ACTIVE" }, select: { id: true } });
  let count = 0;
  for (const e of employees) {
    const result = await bonusFor(session.orgId, e.id, inputs.fy, inputs.rate, inputs.ceiling);
    if (!result) continue;
    const outcome = await addEarningToDraft(session.orgId, e.id, `Statutory bonus ${inputs.fy}`, result.amount);
    if (outcome === "added") count += 1;
  }
  if (count > 0) {
    await recordAudit(session, "BONUS_ADDED_ALL", "PayrollRun", `Added statutory bonus (${inputs.rate}%) for ${count} employee${count === 1 ? "" : "s"}`);
  }
}

export async function addArrears(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

  const employeeId = String(formData.get("employeeId") ?? "");
  const months = Number(formData.get("months"));
  const monthlyDifference = Number(formData.get("monthlyDifference"));
  if (!employeeId) return { ok: false, error: "Select an employee." };
  if (!(months > 0 && months <= 36)) return { ok: false, error: "Enter the number of months (up to 36)." };
  if (!(monthlyDifference > 0)) return { ok: false, error: "Enter the monthly difference in pay." };

  const employee = await db.employee.findFirst({ where: { id: employeeId, orgId: session.orgId } });
  if (!employee) return { ok: false, error: "Employee not found." };

  const amount = Math.round(months * monthlyDifference);
  // Arrears can legitimately be added more than once for one person, so the
  // name carries the figures and only an identical entry counts as a duplicate.
  const outcome = await addEarningToDraft(session.orgId, employeeId, `Arrears (${months} mo x ${monthlyDifference})`, amount);
  if (outcome === "no-draft") return { ok: false, error: "Start a payroll run first, arrears are added to the current Draft." };
  if (outcome === "duplicate") return { ok: false, error: "That exact arrears entry is already on the Draft run." };

  await recordAudit(session, "ARREARS_ADDED", "Employee", `Added arrears of ${amount} for ${employee.name}`, employeeId);
  return { ok: true };
}

export async function addGratuityToDraft(employeeId: string): Promise<void> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

  const employee = await db.employee.findFirst({
    where: { id: employeeId, orgId: session.orgId },
    include: { salaryStructures: { orderBy: { effectiveFrom: "desc" }, take: 1 } },
  });
  const structure = employee?.salaryStructures[0];
  if (!employee || !structure) return;

  const gratuity = calculateGratuity(Number(structure.basic), employee.doj, employee.dol ?? new Date());
  if (gratuity.daysUntilEligible !== null) return; // not yet eligible

  const outcome = await addEarningToDraft(session.orgId, employeeId, "Gratuity", gratuity.accruedAmount);
  if (outcome === "added") {
    await recordAudit(session, "GRATUITY_ADDED", "Employee", `Added gratuity ${gratuity.accruedAmount} for ${employee.name}`, employeeId);
  }
}
