
-- CreateEnum
CREATE TYPE "CertificateCategory" AS ENUM ('PF_REGISTRATION', 'ESI_REGISTRATION', 'GST_REGISTRATION', 'SHOPS_ESTABLISHMENT', 'TRADE_LICENCE', 'OTHER');

-- AlterTable
ALTER TABLE "Certificate" ADD COLUMN     "category" "CertificateCategory" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "fileData" BYTEA,
ADD COLUMN     "fileMimeType" TEXT,
ADD COLUMN     "fileName" TEXT;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "complianceDigestEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastComplianceDigestSentAt" TIMESTAMP(3);
