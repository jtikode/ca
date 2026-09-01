import { z } from "zod";

const emptyToUndefined = (val: unknown) => (val === "" || val == null ? undefined : val);
// Excel auto-types a long digit-only cell (bank account no., UAN, ...) as a
// Number unless the column was formatted as Text first — coerce it back to
// a string rather than rejecting the whole row for a near-universal mistake.
const optionalString = z.preprocess(
  (val) => {
    const v = emptyToUndefined(val);
    return typeof v === "number" ? String(v) : v;
  },
  z.string().optional(),
);
const optionalNumber = z.preprocess(emptyToUndefined, z.coerce.number().optional());
const booleanFromCheckbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());

// PT slabs are seeded for these states in the MVP; employees in any other
// state simply get no PT deduction until an admin adds a slab for it.
export const SUPPORTED_STATES = ["Maharashtra", "Karnataka"] as const;

export const signupSchema = z.object({
  orgName: z.string().min(2, "Company name is required."),
  state: z.string().min(1, "State is required."),
  name: z.string().min(1, "Your name is required."),
  email: z.string().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(1, "Password is required."),
});

export const EMPLOYMENT_STAGES = ["PROBATION", "CONFIRMED"] as const;
export const EMPLOYMENT_BASES = ["PERMANENT", "CONTRACT"] as const;
export const EMPLOYEE_CATEGORIES = ["NON_MANAGERIAL", "MANAGERIAL"] as const;
export const PAY_MODES = ["MONTHLY", "HOURLY_ATTENDANCE", "WAGE_BASED"] as const;
export const WAGE_RATE_TYPES = ["HOURLY", "DAILY"] as const;
export const DOCUMENT_CATEGORIES = ["TRAINING", "CHECKLIST", "DOCUMENT"] as const;

export const addCertificateSchema = z.object({
  name: z.string().min(1, "Certificate name is required."),
  expiryDate: z.coerce.date({ message: "Enter a valid expiry date." }),
});

export const addDocumentSchema = z.object({
  title: z.string().min(1, "Title is required."),
  category: z.enum(DOCUMENT_CATEGORIES),
  url: z.string().url("Enter a valid URL."),
  employeeIds: z.array(z.string()).min(1, "Select at least one employee."),
});

export const addStoreSchema = z.object({
  name: z.string().min(1, "Store name is required."),
});

export const otherAllowanceItemSchema = z.object({
  name: z.string().min(1),
  amount: z.coerce.number().nonnegative(),
  basis: z.enum(["FIXED", "ATTENDANCE"]),
});
export const otherAllowancesSchema = z.array(otherAllowanceItemSchema).max(20);

// The salary-structure form serializes its dynamic allowance rows to a
// single hidden JSON field rather than reconstructing an indexed
// multipart-array field name per row.
const otherAllowancesFromJson = z.preprocess((v) => {
  if (typeof v !== "string" || v.trim() === "") return [];
  try {
    return JSON.parse(v);
  } catch {
    return v; // left as a string so the array schema below fails cleanly
  }
}, otherAllowancesSchema);

export const employeeSchema = z.object({
  employeeCode: z.string().min(1, "Employee code is required."),
  name: z.string().min(1, "Name is required."),
  doj: z.coerce.date({ error: "Date of joining is required." }),
  dob: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  gender: optionalString,
  pan: optionalString,
  uan: optionalString,
  esiNumber: optionalString,
  mlwfIdNumber: optionalString,
  bankAccountNo: optionalString,
  bankIfsc: optionalString,
  state: z.string().min(1, "State is required."),
  pfApplicable: booleanFromCheckbox,
  esiApplicable: booleanFromCheckbox,
  basic: z.coerce.number().nonnegative(),
  hra: z.coerce.number().nonnegative(),
  da: z.coerce.number().nonnegative().default(0),
  conveyance: z.coerce.number().nonnegative().default(0),
  medicalAllowance: z.coerce.number().nonnegative().default(0),
  specialAllowance: z.coerce.number().nonnegative().default(0),
  otherAllowances: otherAllowancesFromJson.default([]),
  designation: optionalString,
  employmentStage: z.enum(EMPLOYMENT_STAGES).default("PROBATION"),
  employmentBasis: z.enum(EMPLOYMENT_BASES).default("PERMANENT"),
  employeeCategory: z.enum(EMPLOYEE_CATEGORIES).default("NON_MANAGERIAL"),
});

export const updateEmployeeDetailsSchema = z.object({
  designation: optionalString,
  employmentStage: z.enum(EMPLOYMENT_STAGES),
  probationEndDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  employmentBasis: z.enum(EMPLOYMENT_BASES),
  employeeCategory: z.enum(EMPLOYEE_CATEGORIES),
  ptApplicable: booleanFromCheckbox,
  dol: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  esiNumber: optionalString,
  mlwfIdNumber: optionalString,
  payMode: z.enum(PAY_MODES).default("MONTHLY"),
  shiftHoursPerDay: optionalNumber,
  freeLeaveDaysPerMonth: z.preprocess(emptyToUndefined, z.coerce.number().int().nonnegative().optional()),
  excessLeaveDailyDeduction: optionalNumber,
  wageRateType: z.preprocess(emptyToUndefined, z.enum(WAGE_RATE_TYPES).optional()),
  wageRate: optionalNumber,
  pfApplicable: booleanFromCheckbox,
  esiApplicable: booleanFromCheckbox,
  storeId: optionalString,
});

export const leavePolicySchema = z.object({
  casualLeavePerYear: z.coerce.number().int().nonnegative(),
  sickLeavePerYear: z.coerce.number().int().nonnegative(),
  earnedLeavePerYear: z.coerce.number().int().nonnegative(),
});

const attendancePresentSchema = z.preprocess((v) => {
  const s = String(v ?? "").trim().toLowerCase();
  if (["present", "p", "true", "1", "yes", "y"].includes(s)) return true;
  if (["absent", "a", "false", "0", "no", "n"].includes(s)) return false;
  return v; // left unrecognized so validation fails with a clear message
}, z.boolean({ error: "Status must be Present or Absent." }));

export const attendanceImportRowSchema = z.object({
  employeeCode: z.string().min(1, "Employee code is required."),
  date: z.coerce.date({ error: "A valid date is required." }),
  present: attendancePresentSchema,
  hoursWorked: optionalNumber,
});

export const taxDeclarationSchema = z.object({
  financialYear: z.string().min(1),
  regime: z.enum(["OLD", "NEW"]),
  section80C: z.coerce.number().nonnegative().default(0),
  section80D: z.coerce.number().nonnegative().default(0),
  hraRentPaid: z.coerce.number().nonnegative().default(0),
  homeLoanInterest: z.coerce.number().nonnegative().default(0),
  otherIncome: z.coerce.number().nonnegative().default(0),
});

// Excel cells arrive as real booleans, "TRUE"/"FALSE", "Yes"/"No", or blank
// — unlike the single-add form's checkbox ("on"/"true" only). Blank defaults
// to true, matching the single-add form's defaultChecked.
const flexibleBoolean = z.preprocess((v) => {
  if (typeof v === "boolean") return v;
  if (v == null || v === "") return true;
  return ["true", "yes", "y", "1"].includes(String(v).trim().toLowerCase());
}, z.boolean());

export const employeeImportRowSchema = employeeSchema.extend({
  pfApplicable: flexibleBoolean,
  esiApplicable: flexibleBoolean,
  // Unlike the single-add form (where an empty basic/HRA cell can't be
  // submitted at all thanks to the HTML `required` attribute), a blank
  // spreadsheet cell coerces to 0 and would otherwise pass `.nonnegative()`
  // silently — require a real positive value for a bulk row instead.
  basic: z.coerce.number().positive("Basic salary is required and must be greater than 0."),
  hra: z.coerce.number().nonnegative("HRA must be 0 or greater."),
  // Store NAME (not id) — resolved to a storeId in bulkUploadEmployees.
  // Bulk-upload-only; the single "Add employee" form has no store field
  // (store assignment is otherwise edit-only, see EmployeeDetailsForm).
  store: optionalString,
});

export const payrollRunInputSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
});

export { optionalString, optionalNumber, booleanFromCheckbox };
