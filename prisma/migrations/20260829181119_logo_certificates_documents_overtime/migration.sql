-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('TRAINING', 'CHECKLIST', 'DOCUMENT');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "overtimeAutoCalculateEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "overtimeRateMultiplier" DECIMAL(65,30) NOT NULL DEFAULT 2,
ADD COLUMN     "standardHoursPerDay" DECIMAL(65,30) NOT NULL DEFAULT 8;

-- AlterTable
ALTER TABLE "PayslipLine" ADD COLUMN     "overtimeAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyDocument" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CompanyDocumentToEmployee" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CompanyDocumentToEmployee_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Certificate_orgId_idx" ON "Certificate"("orgId");

-- CreateIndex
CREATE INDEX "CompanyDocument_orgId_idx" ON "CompanyDocument"("orgId");

-- CreateIndex
CREATE INDEX "_CompanyDocumentToEmployee_B_index" ON "_CompanyDocumentToEmployee"("B");

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyDocument" ADD CONSTRAINT "CompanyDocument_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompanyDocumentToEmployee" ADD CONSTRAINT "_CompanyDocumentToEmployee_A_fkey" FOREIGN KEY ("A") REFERENCES "CompanyDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompanyDocumentToEmployee" ADD CONSTRAINT "_CompanyDocumentToEmployee_B_fkey" FOREIGN KEY ("B") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
