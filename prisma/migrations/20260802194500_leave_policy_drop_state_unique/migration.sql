-- LeavePolicy is becoming org-scoped instead of state-scoped (multiple orgs
-- can share a state, so the old state-unique constraint must go before the
-- one-row-per-org backfill can run). orgId's own uniqueness is added in a
-- later migration once every existing row has one.
DROP INDEX "LeavePolicy_state_key";
