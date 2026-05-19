-- AlterTable
ALTER TABLE "users" ADD COLUMN     "gstin" TEXT,
ADD COLUMN     "iec" TEXT,
ADD COLUMN     "mobile" TEXT,
ADD COLUMN     "pan" TEXT;

-- CreateTable
CREATE TABLE "otp_verifications" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_verifications_pkey" PRIMARY KEY ("id")
);
