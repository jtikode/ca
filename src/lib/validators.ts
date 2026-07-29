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

export const payrollRunInputSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
});

export { optionalString, optionalNumber, booleanFromCheckbox };
