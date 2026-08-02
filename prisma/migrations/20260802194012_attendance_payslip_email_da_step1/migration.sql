-- CreateEnum
CREATE TYPE "PayMode" AS ENUM ('MONTHLY', 'HOURLY_ATTENDANCE');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "excessLeaveDailyDeduction" DECIMAL(65,30),
ADD COLUMN     "freeLeaveDaysPerMonth" INTEGER,
ADD COLUMN     "mlwfIdNumber" TEXT,
ADD COLUMN     "payMode" "PayMode" NOT NULL DEFAULT 'MONTHLY',
ADD COLUMN     "shiftHoursPerDay" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "LeavePolicy" ADD COLUMN     "orgId" TEXT;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "payslipEmailEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PayslipLine" ADD COLUMN     "attendanceDeduction" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SalaryStructure" ADD COLUMN     "da" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "present" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Attendance_orgId_date_idx" ON "Attendance"("orgId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_employeeId_date_key" ON "Attendance"("employeeId", "date");

-- AddForeignKey
ALTER TABLE "LeavePolicy" ADD CONSTRAINT "LeavePolicy_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

