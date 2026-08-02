// One-off data migration, already run against the live database as part of
// the LeavePolicy state->org migration (see prisma/migrations/
// 20260802194500_leave_policy_drop_state_unique and
// 20260802195000_leave_policy_org_scoped_step2). Kept for the historical
// record; re-running is a no-op today since every org already has a row.
//
// At the time this ran, orgId wasn't a unique column yet (that constraint
// was added afterward in Migration B), hence findFirst + create/update
// instead of a plain upsert.
import "dotenv/config";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { leavePolicyDefaultsForState } from "../../src/lib/leavePolicyDefaults";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL as string });
const db = new PrismaClient({ adapter });

async function main() {
  const orgs = await db.organization.findMany();
  let created = 0;
  let updated = 0;

  for (const org of orgs) {
    const defaults = leavePolicyDefaultsForState(org.state);
    const existing = await db.leavePolicy.findFirst({ where: { orgId: org.id } });
    if (existing) {
      await db.leavePolicy.update({ where: { id: existing.id }, data: { state: org.state, ...defaults } });
      updated++;
    } else {
      await db.leavePolicy.create({ data: { orgId: org.id, state: org.state, ...defaults } });
      created++;
    }
  }

  console.log(`Orgs processed: ${orgs.length} (created ${created}, updated ${updated}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
