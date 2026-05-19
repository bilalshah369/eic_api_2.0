-- CreateTable: PIALabEquipment (Annexure-3)
CREATE TABLE "pia"."pia_lab_equipment" (
    "id" TEXT NOT NULL,
    "piaApplicationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "serialNo" TEXT,
    "rangeCapacity" TEXT,
    "calibrationDueDate" TEXT,

    CONSTRAINT "pia_lab_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PIALabProduct (products tested)
CREATE TABLE "pia"."pia_lab_products" (
    "id" TEXT NOT NULL,
    "piaApplicationId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "testParameters" TEXT,
    "testMethods" TEXT,

    CONSTRAINT "pia_lab_products_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "pia"."pia_lab_equipment" ADD CONSTRAINT "pia_lab_equipment_piaApplicationId_fkey"
  FOREIGN KEY ("piaApplicationId") REFERENCES "pia"."pia_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pia"."pia_lab_products" ADD CONSTRAINT "pia_lab_products_piaApplicationId_fkey"
  FOREIGN KEY ("piaApplicationId") REFERENCES "pia"."pia_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
