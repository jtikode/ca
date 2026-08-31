"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertSession } from "@/lib/permissions";
import { employeeSchema, taxDeclarationSchema, updateEmployeeDetailsSchema } from "@/lib/validators";
import { parseEmployeeImport, type ImportError } from "@/lib/employeeImport";
import type { Prisma } from "@/generated/prisma/client";

export interface ActionResult {
  ok: boolean;
  error?: string;
  pending?: boolean;
}

export interface BulkUploadResult {
  ok: boolean;
  error?: string;
  createdCount?: number;
  pendingCount?: number;
  rowErrors?: ImportError[];
}

export async function createEmployee(_prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

  const parsed = employeeSchema.safeParse({
    employeeCode: formData.get("employeeCode"),
    name: formData.get("name"),
    doj: formData.get("doj"),
    dob: formData.get("dob"),
    gender: formData.get("gender"),
    pan: formData.get("pan"),
    uan: formData.get("uan"),
    esiNumber: formData.get("esiNumber"),
    mlwfIdNumber: formData.get("mlwfIdNumber"),
    bankAccountNo: formData.get("bankAccountNo"),
    bankIfsc: formData.get("bankIfsc"),
    state: formData.get("state"),
    pfApplicable: formData.get("pfApplicable"),
    esiApplicable: formData.get("esiApplicable"),
    basic: formData.get("basic"),
    hra: formData.get("hra"),
    da: formData.get("da"),
    conveyance: formData.get("conveyance"),
    medicalAllowance: formData.get("medicalAllowance"),
    specialAllowance: formData.get("specialAllowance"),
    otherAllowances: formData.get("otherAllowancesJson"),
    designation: formData.get("designation"),
    employmentStage: formData.get("employmentStage"),
    employmentBasis: formData.get("employmentBasis"),
    employeeCategory: formData.get("employeeCategory"),
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

  if (session.role === "HR_MANAGER") {
    await db.approvalRequest.create({
      data: {
        orgId: session.orgId,
        type: "CREATE_EMPLOYEE",
        requestedById: session.userId,
        payload: {
          ...parsed.data,
          doj: parsed.data.doj.toISOString(),
          dob: parsed.data.dob ? parsed.data.dob.toISOString() : null,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    revalidatePath("/employees");
    revalidatePath("/approvals");
    return { ok: true, pending: true };
  }

  const { basic, hra, da, conveyance, medicalAllowance, specialAllowance, otherAllowances, ...employeeData } =
    parsed.data;

  await db.employee.create({
    data: {
      orgId: session.orgId,
      ...employeeData,
      salaryStructures: {
        create: {
          effectiveFrom: parsed.data.doj,
          basic,
          hra,
          da,
          conveyance,
          medicalAllowance,
          specialAllowance,
          otherAllowances: otherAllowances as unknown as Prisma.InputJsonValue,
        },
      },
    },
  });

  revalidatePath("/employees");
  return { ok: true };
}

export async function toggleEmployeeStatus(employeeId: string, active: boolean): Promise<void> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

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
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

  const employee = await db.employee.findFirst({ where: { id: employeeId, orgId: session.orgId } });
  if (!employee) {
    return { ok: false, error: "Employee not found." };
  }

  const parsed = employeeSchema
    .pick({
      basic: true,
      hra: true,
      da: true,
      conveyance: true,
      medicalAllowance: true,
      specialAllowance: true,
      otherAllowances: true,
    })
    .safeParse({
      basic: formData.get("basic"),
      hra: formData.get("hra"),
      da: formData.get("da"),
      conveyance: formData.get("conveyance"),
      medicalAllowance: formData.get("medicalAllowance"),
      specialAllowance: formData.get("specialAllowance"),
      otherAllowances: formData.get("otherAllowancesJson"),
    });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  if (session.role === "HR_MANAGER") {
    await db.approvalRequest.create({
      data: {
        orgId: session.orgId,
        type: "UPDATE_SALARY",
        requestedById: session.userId,
        payload: { employeeId, ...parsed.data } as unknown as Prisma.InputJsonValue,
      },
    });

    revalidatePath(`/employees/${employeeId}`);
    revalidatePath("/approvals");
    return { ok: true, pending: true };
  }

  const { otherAllowances, ...salary } = parsed.data;
  await db.salaryStructure.create({
    data: {
      employeeId,
      effectiveFrom: new Date(),
      ...salary,
      otherAllowances: otherAllowances as unknown as Prisma.InputJsonValue,
    },
  });

  revalidatePath(`/employees/${employeeId}`);
  return { ok: true };
}

export async function saveTaxDeclaration(
  employeeId: string,
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

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

// Not approval-gated, unlike createEmployee/updateSalaryStructure — the
// plan's scope decision is that only employee-creation and salary changes
// need superadmin sign-off.
export async function updateEmployeeDetails(
  employeeId: string,
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

  const employee = await db.employee.findFirst({ where: { id: employeeId, orgId: session.orgId } });
  if (!employee) {
    return { ok: false, error: "Employee not found." };
  }

  const parsed = updateEmployeeDetailsSchema.safeParse({
    designation: formData.get("designation"),
    employmentStage: formData.get("employmentStage"),
    probationEndDate: formData.get("probationEndDate"),
    employmentBasis: formData.get("employmentBasis"),
    employeeCategory: formData.get("employeeCategory"),
    ptApplicable: formData.get("ptApplicable"),
    dol: formData.get("dol"),
    esiNumber: formData.get("esiNumber"),
    mlwfIdNumber: formData.get("mlwfIdNumber"),
    payMode: formData.get("payMode"),
    shiftHoursPerDay: formData.get("shiftHoursPerDay"),
    freeLeaveDaysPerMonth: formData.get("freeLeaveDaysPerMonth"),
    excessLeaveDailyDeduction: formData.get("excessLeaveDailyDeduction"),
    wageRateType: formData.get("wageRateType"),
    wageRate: formData.get("wageRate"),
    pfApplicable: formData.get("pfApplicable"),
    esiApplicable: formData.get("esiApplicable"),
    storeId: formData.get("storeId"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  // storeId needs an explicit null (not "leave unchanged") when the admin picks
  // "No store" — optionalString's undefined would otherwise be dropped by
  // Prisma's update and silently leave a previous assignment in place.
  const { storeId, ...rest } = parsed.data;
  await db.employee.update({
    where: { id: employeeId },
    data: { ...rest, storeId: storeId ?? null },
  });

  revalidatePath(`/employees/${employeeId}`);
  return { ok: true };
}

// All-or-nothing: if any row fails validation or has a duplicate employee
// code, nothing is created — the caller fixes the sheet and re-uploads.
export async function bulkUploadEmployees(
  _prevState: BulkUploadResult | null,
  formData: FormData,
): Promise<BulkUploadResult> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a file to upload." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { valid, errors } = await parseEmployeeImport(buffer, session.orgId);

  if (valid.length === 0 && errors.length === 0) {
    return { ok: false, error: "The file has no employee rows." };
  }
  if (errors.length > 0) {
    return { ok: false, error: `${errors.length} row(s) had errors — fix and re-upload.`, rowErrors: errors };
  }

  // Store is uploaded as a name, not an id — resolve it once against this
  // org's stores (case-insensitive). Blank or unmatched names simply leave
  // the employee unassigned; a bad store name never blocks the upload.
  const orgStores = await db.store.findMany({ where: { orgId: session.orgId }, select: { id: true, name: true } });
  const storeIdByName = new Map(orgStores.map((s) => [s.name.toLowerCase(), s.id]));
  const resolvedRows = valid.map((row) => {
    const { store, ...rest } = row;
    const storeId = store ? storeIdByName.get(store.toLowerCase()) : undefined;
    return { ...rest, storeId };
  });

  if (session.role === "HR_MANAGER") {
    await db.approvalRequest.createMany({
      data: resolvedRows.map((row) => {
        const { doj, dob, ...rest } = row;
        return {
          orgId: session.orgId,
          type: "CREATE_EMPLOYEE" as const,
          requestedById: session.userId,
          payload: { ...rest, doj: doj.toISOString(), dob: dob ? dob.toISOString() : null } as unknown as Prisma.InputJsonValue,
        };
      }),
    });

    revalidatePath("/employees");
    revalidatePath("/approvals");
    return { ok: true, pendingCount: resolvedRows.length };
  }

  await db.$transaction(
    resolvedRows.map((row) => {
      const { basic, hra, da, conveyance, medicalAllowance, specialAllowance, otherAllowances, ...employeeData } =
        row;
      return db.employee.create({
        data: {
          orgId: session.orgId,
          ...employeeData,
          salaryStructures: {
            create: {
              effectiveFrom: row.doj,
              basic,
              hra,
              da,
              conveyance,
              medicalAllowance,
              specialAllowance,
              otherAllowances: otherAllowances as unknown as Prisma.InputJsonValue,
            },
          },
        },
      });
    }),
  );

  revalidatePath("/employees");
  return { ok: true, createdCount: valid.length };
}
