"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertSession } from "@/lib/permissions";
import { employeeSchema, taxDeclarationSchema } from "@/lib/validators";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function createEmployee(_prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const session = await assertSession(["OWNER", "ADMIN"]);

  const parsed = employeeSchema.safeParse({
    employeeCode: formData.get("employeeCode"),
    name: formData.get("name"),
    doj: formData.get("doj"),
    dob: formData.get("dob"),
    gender: formData.get("gender"),
    pan: formData.get("pan"),
    uan: formData.get("uan"),
    esiNumber: formData.get("esiNumber"),
    bankAccountNo: formData.get("bankAccountNo"),
    bankIfsc: formData.get("bankIfsc"),
    state: formData.get("state"),
    pfApplicable: formData.get("pfApplicable"),
    esiApplicable: formData.get("esiApplicable"),
    basic: formData.get("basic"),
    hra: formData.get("hra"),
    conveyance: formData.get("conveyance"),
    medicalAllowance: formData.get("medicalAllowance"),
    specialAllowance: formData.get("specialAllowance"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const existing = await db.employee.findUnique({
    where: { orgId_employeeCode: { orgId: session.orgId, employeeCode: parsed.data.employeeCode } },
  });
  if (existing) {
    return { ok: false, error: "That employee code is already in use." };
  }

  const { basic, hra, conveyance, medicalAllowance, specialAllowance, ...employeeData } = parsed.data;

  await db.employee.create({
    data: {
      orgId: session.orgId,
      ...employeeData,
      salaryStructures: {
        create: {
          effectiveFrom: parsed.data.doj,
          basic,
          hra,
          conveyance,
          medicalAllowance,
          specialAllowance,
        },
      },
    },
  });

  revalidatePath("/employees");
  return { ok: true };
}

export async function toggleEmployeeStatus(employeeId: string, active: boolean): Promise<void> {
  const session = await assertSession(["OWNER", "ADMIN"]);

  await db.employee.updateMany({
    where: { id: employeeId, orgId: session.orgId },
    data: { status: active ? "ACTIVE" : "INACTIVE" },
  });

  revalidatePath("/employees");
}

export async function updateSalaryStructure(
  employeeId: string,
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await assertSession(["OWNER", "ADMIN"]);

  const employee = await db.employee.findFirst({ where: { id: employeeId, orgId: session.orgId } });
  if (!employee) {
    return { ok: false, error: "Employee not found." };
  }

  const parsed = employeeSchema
    .pick({ basic: true, hra: true, conveyance: true, medicalAllowance: true, specialAllowance: true })
    .safeParse({
      basic: formData.get("basic"),
      hra: formData.get("hra"),
      conveyance: formData.get("conveyance"),
      medicalAllowance: formData.get("medicalAllowance"),
      specialAllowance: formData.get("specialAllowance"),
    });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db.salaryStructure.create({
    data: { employeeId, effectiveFrom: new Date(), ...parsed.data },
  });

  revalidatePath(`/employees/${employeeId}`);
  return { ok: true };
}

export async function saveTaxDeclaration(
  employeeId: string,
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await assertSession(["OWNER", "ADMIN"]);

  const employee = await db.employee.findFirst({ where: { id: employeeId, orgId: session.orgId } });
  if (!employee) {
    return { ok: false, error: "Employee not found." };
  }

  const parsed = taxDeclarationSchema.safeParse({
    financialYear: formData.get("financialYear"),
    regime: formData.get("regime"),
    section80C: formData.get("section80C"),
    section80D: formData.get("section80D"),
    hraRentPaid: formData.get("hraRentPaid"),
    homeLoanInterest: formData.get("homeLoanInterest"),
    otherIncome: formData.get("otherIncome"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db.taxDeclaration.upsert({
    where: { employeeId_financialYear: { employeeId, financialYear: parsed.data.financialYear } },
    create: { employeeId, ...parsed.data },
    update: parsed.data,
  });

  revalidatePath(`/employees/${employeeId}`);
  return { ok: true };
}
