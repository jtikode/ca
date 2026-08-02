// Single source of truth for default LeavePolicy values, used by the
// LeavePolicy org-migration data script, signup(), and platform admin's
// createOrganization() — every place a new org needs an initial policy.
//
// Maharashtra's sickLeavePerYear is deliberately 0, not the Shops &
// Establishments Act's typical figure (15, as previously seeded) — per an
// explicit business decision, not an oversight.
export interface LeavePolicyDefault {
  casualLeavePerYear: number;
  sickLeavePerYear: number;
  earnedLeavePerYear: number;
}

export const LEAVE_POLICY_STATE_DEFAULTS: Record<string, LeavePolicyDefault> = {
  Maharashtra: { casualLeavePerYear: 8, sickLeavePerYear: 0, earnedLeavePerYear: 15 },
  Karnataka: { casualLeavePerYear: 12, sickLeavePerYear: 12, earnedLeavePerYear: 12 },
};

export const LEAVE_POLICY_FALLBACK_DEFAULT: LeavePolicyDefault = {
  casualLeavePerYear: 0,
  sickLeavePerYear: 0,
  earnedLeavePerYear: 0,
};

export function leavePolicyDefaultsForState(state: string): LeavePolicyDefault {
  return LEAVE_POLICY_STATE_DEFAULTS[state] ?? LEAVE_POLICY_FALLBACK_DEFAULT;
}
