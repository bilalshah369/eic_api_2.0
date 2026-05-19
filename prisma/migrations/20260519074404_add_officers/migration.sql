-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateTable
CREATE TABLE "officers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "qualification" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "telephone" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "gender" "Gender" NOT NULL DEFAULT 'MALE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "officers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "certificate_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "officer_offices" (
    "officerId" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,

    CONSTRAINT "officer_offices_pkey" PRIMARY KEY ("officerId","officeId")
);

-- CreateTable
CREATE TABLE "officer_products" (
    "officerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "officer_products_pkey" PRIMARY KEY ("officerId","productId")
);

-- CreateIndex
CREATE UNIQUE INDEX "certificate_products_name_key" ON "certificate_products"("name");

-- AddForeignKey
ALTER TABLE "officer_offices" ADD CONSTRAINT "officer_offices_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "officers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "officer_offices" ADD CONSTRAINT "officer_offices_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "officer_products" ADD CONSTRAINT "officer_products_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "officers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "officer_products" ADD CONSTRAINT "officer_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "certificate_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
