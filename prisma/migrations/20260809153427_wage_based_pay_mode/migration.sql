-- CreateEnum
CREATE TYPE "WageRateType" AS ENUM ('HOURLY', 'DAILY');

-- AlterEnum
ALTER TYPE "PayMode" ADD VALUE 'WAGE_BASED';

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "hoursWorked" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "wageRate" DECIMAL(65,30),
ADD COLUMN     "wageRateType" "WageRateType";
