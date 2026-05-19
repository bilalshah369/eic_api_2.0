-- CreateEnum
CREATE TYPE "OfficeType" AS ENUM ('EIC', 'EIA', 'SUB_EIA');

-- CreateTable
CREATE TABLE "offices" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "OfficeType" NOT NULL,
    "parentId" TEXT,
    "address" TEXT,
    "state" TEXT,
    "district" TEXT,
    "subDistrict" TEXT,
    "city" TEXT,
    "pincode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "hasLab" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "offices_code_key" ON "offices"("code");

-- AddForeignKey
ALTER TABLE "offices" ADD CONSTRAINT "offices_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
