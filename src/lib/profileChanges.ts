export const PROFILE_FIELDS = ["email", "dob", "pan", "uan", "bankAccountNo", "bankIfsc"] as const;
export type ProfileField = (typeof PROFILE_FIELDS)[number];

export const PROFILE_FIELD_LABELS: Record<ProfileField, string> = {
  email: "Email",
  dob: "Date of birth",
  pan: "PAN",
  uan: "UAN",
  bankAccountNo: "Bank account number",
  bankIfsc: "Bank IFSC",
};

type Validator = (value: string) => string | null; // returns an error message, or null when valid

const VALIDATORS: Record<ProfileField, Validator> = {
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? null : "Enter a valid email."),
  dob: (v) => (Number.isNaN(new Date(v).getTime()) ? "Enter a valid date of birth." : null),
  pan: (v) => (/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v) ? null : "PAN looks like ABCDE1234F."),
  uan: (v) => (/^\d{12}$/.test(v) ? null : "UAN is 12 digits."),
  bankAccountNo: (v) => (/^\d{6,18}$/.test(v) ? null : "Bank account number should be 6 to 18 digits."),
  bankIfsc: (v) => (/^[A-Z]{4}0[A-Z0-9]{6}$/.test(v) ? null : "IFSC looks like HDFC0001234."),
};

function normalize(field: ProfileField, raw: string): string {
  const v = raw.trim();
  return field === "pan" || field === "bankIfsc" ? v.toUpperCase() : v;
}

/** Keeps only fields that were filled in and differ from the current value,
 * and validates each. Returns the first error, or the cleaned changes. */
export function cleanProfileChanges(
  submitted: Partial<Record<ProfileField, string>>,
  current: Partial<Record<ProfileField, string>>,
): { error: string } | { changes: Partial<Record<ProfileField, string>> } {
  const changes: Partial<Record<ProfileField, string>> = {};
  for (const field of PROFILE_FIELDS) {
    const raw = submitted[field];
    if (raw === undefined || raw.trim() === "") continue;
    const value = normalize(field, raw);
    const error = VALIDATORS[field](value);
    if (error) return { error: `${PROFILE_FIELD_LABELS[field]}: ${error}` };
    if (value !== (current[field] ?? "")) changes[field] = value;
  }
  if (Object.keys(changes).length === 0) return { error: "Nothing to change, the values match what is on file." };
  return { changes };
}
