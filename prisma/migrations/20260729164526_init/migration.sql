-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'ACCOUNTANT');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "TaxRegime" AS ENUM ('OLD', 'NEW');

-- CreateEnum
CREATE TYPE "PayrollRunStatus" AS ENUM ('DRAFT', 'FINALIZED');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "pan" TEXT,
    "tan" TEXT,
    "state" TEXT NOT NULL,
    "pfRegistrationNo" TEXT,
    "esiRegistrationNo" TEXT,
    "pfApplicable" BOOLEAN NOT NULL DEFAULT true,
    "esiApplicable" BOOLEAN NOT NULL DEFAULT true,
    "financialYearStartMonth" INTEGER NOT NULL DEFAULT 4,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dob" TIMESTAMP(3),
    "gender" TEXT,
    "doj" TIMESTAMP(3) NOT NULL,
    "dol" TIMESTAMP(3),
    "pan" TEXT,
    "uan" TEXT,
    "esiNumber" TEXT,
    "bankAccountNo" TEXT,
    "bankIfsc" TEXT,
    "state" TEXT NOT NULL,
    "pfApplicable" BOOLEAN NOT NULL DEFAULT true,
    "esiApplicable" BOOLEAN NOT NULL DEFAULT true,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryStructure" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "basic" DECIMAL(65,30) NOT NULL,
    "hra" DECIMAL(65,30) NOT NULL,
    "conveyance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "medicalAllowance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "specialAllowance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "otherAllowances" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalaryStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxDeclaration" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "financialYear" TEXT NOT NULL,
    "regime" "TaxRegime" NOT NULL DEFAULT 'NEW',
    "section80C" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "section80D" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "hraRentPaid" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "homeLoanInterest" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "otherIncome" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxDeclaration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "PayrollRunStatus" NOT NULL DEFAULT 'DRAFT',
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayslipLine" (
    "id" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "daysInMonth" INTEGER NOT NULL,
    "daysPaid" DECIMAL(65,30) NOT NULL,
    "earnings" JSONB NOT NULL,
    "grossEarnings" DECIMAL(65,30) NOT NULL,
    "pfWages" DECIMAL(65,30) NOT NULL,
    "pfEmployee" DECIMAL(65,30) NOT NULL,
    "pfEmployer" DECIMAL(65,30) NOT NULL,
    "pfEps" DECIMAL(65,30) NOT NULL,
    "pfEdli" DECIMAL(65,30) NOT NULL,
    "esiWages" DECIMAL(65,30) NOT NULL,
    "esiEmployee" DECIMAL(65,30) NOT NULL,
    "esiEmployer" DECIMAL(65,30) NOT NULL,
    "ptAmount" DECIMAL(65,30) NOT NULL,
    "tdsAmount" DECIMAL(65,30) NOT NULL,
    "netPay" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayslipLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PTSlab" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "minGross" DECIMAL(65,30) NOT NULL,
    "maxGross" DECIMAL(65,30),
    "monthlyAmount" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PTSlab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomeTaxSlab" (
    "id" TEXT NOT NULL,
    "regime" "TaxRegime" NOT NULL,
    "financialYear" TEXT NOT NULL,
    "minIncome" DECIMAL(65,30) NOT NULL,
    "maxIncome" DECIMAL(65,30),
    "rate" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "IncomeTaxSlab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CAExportBatch" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedById" TEXT NOT NULL,
    "fileUrl" TEXT,

    CONSTRAINT "CAExportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Organization_state_idx" ON "Organization"("state");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_orgId_idx" ON "User"("orgId");

-- CreateIndex
CREATE INDEX "Employee_orgId_idx" ON "Employee"("orgId");

-- CreateIndex
CREATE INDEX "Employee_orgId_status_idx" ON "Employee"("orgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_orgId_employeeCode_key" ON "Employee"("orgId", "employeeCode");

-- CreateIndex
CREATE INDEX "SalaryStructure_employeeId_effectiveFrom_idx" ON "SalaryStructure"("employeeId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "TaxDeclaration_employeeId_financialYear_key" ON "TaxDeclaration"("employeeId", "financialYear");

-- CreateIndex
CREATE INDEX "PayrollRun_orgId_idx" ON "PayrollRun"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollRun_orgId_month_year_key" ON "PayrollRun"("orgId", "month", "year");

-- CreateIndex
CREATE INDEX "PayslipLine_payrollRunId_idx" ON "PayslipLine"("payrollRunId");

-- CreateIndex
CREATE UNIQUE INDEX "PayslipLine_payrollRunId_employeeId_key" ON "PayslipLine"("payrollRunId", "employeeId");

-- CreateIndex
CREATE INDEX "PTSlab_state_effectiveFrom_idx" ON "PTSlab"("state", "effectiveFrom");

-- CreateIndex
CREATE INDEX "IncomeTaxSlab_regime_financialYear_idx" ON "IncomeTaxSlab"("regime", "financialYear");

-- CreateIndex
CREATE INDEX "CAExportBatch_orgId_idx" ON "CAExportBatch"("orgId");

-- CreateIndex
CREATE INDEX "CAExportBatch_payrollRunId_idx" ON "CAExportBatch"("payrollRunId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryStructure" ADD CONSTRAINT "SalaryStructure_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxDeclaration" ADD CONSTRAINT "TaxDeclaration_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayslipLine" ADD CONSTRAINT "PayslipLine_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayslipLine" ADD CONSTRAINT "PayslipLine_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CAExportBatch" ADD CONSTRAINT "CAExportBatch_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CAExportBatch" ADD CONSTRAINT "CAExportBatch_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
