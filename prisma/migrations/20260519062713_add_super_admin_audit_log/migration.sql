-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT,
    "userEmail" TEXT,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);
