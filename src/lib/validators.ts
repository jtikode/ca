import { z } from "zod";

const emptyToUndefined = (val: unknown) => (val === "" || val == null ? undefined : val);
const optionalString = z.preprocess(emptyToUndefined, z.string().optional());
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

export const employeeSchema = z.object({
  employeeCode: z.string().min(1, "Employee code is required."),
  name: z.string().min(1, "Name is required."),
  doj: z.coerce.date({ error: "Date of joining is required." }),
  dob: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  gender: optionalString,
  pan: optionalString,
  uan: optionalString,
  esiNumber: optionalString,
  bankAccountNo: optionalString,
  bankIfsc: optionalString,
  state: z.string().min(1, "State is required."),
  pfApplicable: booleanFromCheckbox,
  esiApplicable: booleanFromCheckbox,
  basic: z.coerce.number().nonnegative(),
  hra: z.coerce.number().nonnegative(),
  conveyance: z.coerce.number().nonnegative().default(0),
  medicalAllowance: z.coerce.number().nonnegative().default(0),
  specialAllowance: z.coerce.number().nonnegative().default(0),
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
});

export const payrollRunInputSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
});

export { optionalString, optionalNumber, booleanFromCheckbox };
