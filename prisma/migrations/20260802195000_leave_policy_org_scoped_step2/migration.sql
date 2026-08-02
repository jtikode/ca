-- DropForeignKey
ALTER TABLE "LeavePolicy" DROP CONSTRAINT "LeavePolicy_orgId_fkey";

-- AlterTable
ALTER TABLE "LeavePolicy" ALTER COLUMN "orgId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "LeavePolicy_orgId_key" ON "LeavePolicy"("orgId");

-- CreateIndex
CREATE INDEX "LeavePolicy_state_idx" ON "LeavePolicy"("state");

-- AddForeignKey
ALTER TABLE "LeavePolicy" ADD CONSTRAINT "LeavePolicy_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
