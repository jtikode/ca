import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL as string });
const db = new PrismaClient({ adapter });

// PT slabs are simplified for the MVP: Maharashtra's actual slab is
// gender-specific (women are exempt up to ₹25,000, men up to only ₹7,500)
// and both states add a ₹100 surcharge in February to hit the ₹2,500/year
// constitutional cap. This seed uses the men's/base slab and skips the
// February surcharge — verify against the current state notification
// before relying on it for a real filing.
const PT_SLABS: { state: string; minGross: number; maxGross: number | null; monthlyAmount: number }[] = [
  { state: "Maharashtra", minGross: 0, maxGross: 7500, monthlyAmount: 0 },
  { state: "Maharashtra", minGross: 7500.01, maxGross: 10000, monthlyAmount: 175 },
  { state: "Maharashtra", minGross: 10000.01, maxGross: null, monthlyAmount: 200 },
  { state: "Karnataka", minGross: 0, maxGross: 25000, monthlyAmount: 0 },
  { state: "Karnataka", minGross: 25000.01, maxGross: null, monthlyAmount: 200 },
];

const PT_EFFECTIVE_FROM = new Date("2025-04-01");

// Income tax slabs, FY 2026-27. These move with each Union Budget — verify
// against the Finance Act in force before trusting a real payroll run.
const FINANCIAL_YEAR = "2026-27";

const NEW_REGIME_SLABS: { minIncome: number; maxIncome: number | null; rate: number }[] = [
  { minIncome: 0, maxIncome: 400_000, rate: 0 },
  { minIncome: 400_000, maxIncome: 800_000, rate: 0.05 },
  { minIncome: 800_000, maxIncome: 1_200_000, rate: 0.1 },
  { minIncome: 1_200_000, maxIncome: 1_600_000, rate: 0.15 },
  { minIncome: 1_600_000, maxIncome: 2_000_000, rate: 0.2 },
  { minIncome: 2_000_000, maxIncome: 2_400_000, rate: 0.25 },
  { minIncome: 2_400_000, maxIncome: null, rate: 0.3 },
];

const OLD_REGIME_SLABS: { minIncome: number; maxIncome: number | null; rate: number }[] = [
  { minIncome: 0, maxIncome: 250_000, rate: 0 },
  { minIncome: 250_000, maxIncome: 500_000, rate: 0.05 },
  { minIncome: 500_000, maxIncome: 1_000_000, rate: 0.2 },
  { minIncome: 1_000_000, maxIncome: null, rate: 0.3 },
];

// Statutory leave entitlement per the state's Shops & Establishments Act —
// see prisma/schema.prisma's LeavePolicy comment for the caveats (annual
// entitlement only, not a running balance; earned leave is a full-year
// approximation). Verify against the current Act before relying on it.
const LEAVE_POLICIES: { state: string; casualLeavePerYear: number; sickLeavePerYear: number; earnedLeavePerYear: number }[] = [
  { state: "Maharashtra", casualLeavePerYear: 8, sickLeavePerYear: 15, earnedLeavePerYear: 15 },
  { state: "Karnataka", casualLeavePerYear: 12, sickLeavePerYear: 12, earnedLeavePerYear: 12 },
];

async function main() {
  const existingLeavePolicies = await db.leavePolicy.count();
  if (existingLeavePolicies === 0) {
    await db.leavePolicy.createMany({ data: LEAVE_POLICIES });
    console.log(`Seeded ${LEAVE_POLICIES.length} leave policies.`);
  } else {
    console.log("Leave policies already seeded, skipping.");
  }

  const existingSlabs = await db.pTSlab.count();
  if (existingSlabs === 0) {
    await db.pTSlab.createMany({
      data: PT_SLABS.map((s) => ({ ...s, effectiveFrom: PT_EFFECTIVE_FROM })),
    });
    console.log(`Seeded ${PT_SLABS.length} PT slabs.`);
  } else {
    console.log("PT slabs already seeded, skipping.");
  }

  const existingTaxSlabs = await db.incomeTaxSlab.count({ where: { financialYear: FINANCIAL_YEAR } });
  if (existingTaxSlabs === 0) {
    await db.incomeTaxSlab.createMany({
      data: [
        ...NEW_REGIME_SLABS.map((s) => ({ ...s, regime: "NEW" as const, financialYear: FINANCIAL_YEAR })),
        ...OLD_REGIME_SLABS.map((s) => ({ ...s, regime: "OLD" as const, financialYear: FINANCIAL_YEAR })),
      ],
    });
    console.log(`Seeded income tax slabs for FY ${FINANCIAL_YEAR}.`);
  } else {
    console.log(`Income tax slabs for FY ${FINANCIAL_YEAR} already seeded, skipping.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
