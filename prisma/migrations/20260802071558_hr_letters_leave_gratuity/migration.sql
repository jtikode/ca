-- CreateEnum
CREATE TYPE "EmploymentStage" AS ENUM ('PROBATION', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "EmploymentBasis" AS ENUM ('PERMANENT', 'CONTRACT');

-- CreateEnum
CREATE TYPE "EmployeeCategory" AS ENUM ('NON_MANAGERIAL', 'MANAGERIAL');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "designation" TEXT,
ADD COLUMN     "employeeCategory" "EmployeeCategory" NOT NULL DEFAULT 'NON_MANAGERIAL',
ADD COLUMN     "employmentBasis" "EmploymentBasis" NOT NULL DEFAULT 'PERMANENT',
ADD COLUMN     "employmentStage" "EmploymentStage" NOT NULL DEFAULT 'PROBATION',
ADD COLUMN     "probationEndDate" TIMESTAMP(3),
ADD COLUMN     "ptApplicable" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "address" TEXT;

-- CreateTable
CREATE TABLE "LeavePolicy" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "casualLeavePerYear" INTEGER NOT NULL,
    "sickLeavePerYear" INTEGER NOT NULL,
    "earnedLeavePerYear" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeavePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeavePolicy_state_key" ON "LeavePolicy"("state");

