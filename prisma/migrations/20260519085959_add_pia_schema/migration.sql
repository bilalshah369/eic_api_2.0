-- =====================================================================
-- Fill in missing public schema items (added manually to dev DB)
-- =====================================================================

-- Missing Role enum values
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'EIA_ADMIN';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUB_EIA_ADMIN';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'OFFICER';

-- Missing columns on users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "officeId" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "officerId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "users_officeId_key" ON "users"("officeId");
CREATE UNIQUE INDEX IF NOT EXISTS "users_officerId_key" ON "users"("officerId");
ALTER TABLE "users" ADD CONSTRAINT "users_officeId_fkey"
  FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_officerId_fkey"
  FOREIGN KEY ("officerId") REFERENCES "officers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Application enums
CREATE TYPE "ApplicationType" AS ENUM ('ESTABLISHMENT', 'PIA');
CREATE TYPE "ApplicationStatus" AS ENUM (
  'DRAFT', 'SUBMITTED', 'DEFICIENT', 'DEFICIENCY_RESPONDED',
  'APPROVED', 'REJECTED', 'COA_ISSUED'
);

-- Applications table
CREATE TABLE "applications" (
  "id" TEXT NOT NULL,
  "appNo" TEXT NOT NULL,
  "type" "ApplicationType" NOT NULL,
  "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
  "organisation" TEXT NOT NULL,
  "applicantName" TEXT NOT NULL,
  "userId" TEXT,
  "officeId" TEXT,
  "submittedAt" TIMESTAMP(3),
  "remarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "applications_appNo_key" ON "applications"("appNo");
ALTER TABLE "applications" ADD CONSTRAINT "applications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "applications" ADD CONSTRAINT "applications_officeId_fkey"
  FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =====================================================================
-- Create PIA schema
-- =====================================================================

CREATE SCHEMA IF NOT EXISTS "pia";

-- Enums
CREATE TYPE "pia"."PIASubType" AS ENUM ('NEW_RECOGNITION', 'RENEWAL', 'MODIFICATION');

CREATE TYPE "pia"."PIAStatus" AS ENUM (
  'DRAFT', 'SUBMITTED', 'APPLICATION_FEE_PENDING', 'APPLICATION_FEE_PAID',
  'RECEIVED_BY_EIA', 'FORWARDED_TO_EIC', 'UNDER_DOCUMENT_SCRUTINY',
  'DISCREPANCY_RAISED', 'RESUBMITTED_BY_APPLICANT', 'SCRUTINY_COMPLETED',
  'INSPECTION_OFFICER_NOMINATED', 'INSPECTION_FEE_PENDING', 'INSPECTION_FEE_PAID',
  'INSPECTION_SCHEDULED', 'INSPECTION_COMPLETED', 'NON_CONFORMITY_RAISED',
  'CLOSURE_SUBMITTED', 'CLOSURE_UNDER_REVIEW', 'REPORT_SUBMITTED_TO_EIC',
  'UNDER_FINAL_REVIEW', 'APPROVED_BY_EIC', 'REJECTED', 'GAZETTE_NOTIFICATION_PREPARED',
  'SHARED_WITH_MINISTRY', 'ANNUAL_FEE_PENDING', 'ANNUAL_FEE_PAID',
  'GAZETTE_PUBLISHED', 'PIA_CODE_REQUESTED', 'PIA_CODE_GENERATED',
  'ACTIVE', 'RENEWAL_DUE', 'RENEWED', 'MODIFICATION_UNDER_PROCESS',
  'SUSPENDED', 'EXPIRED', 'WITHDRAWN'
);

CREATE TYPE "pia"."LegalStatusType" AS ENUM (
  'PROPRIETORSHIP', 'PARTNERSHIP', 'LLP', 'PRIVATE_LIMITED', 'PUBLIC_LIMITED',
  'TRUST', 'SOCIETY', 'OTHER'
);

CREATE TYPE "pia"."QMSType" AS ENUM ('ISO_17020', 'ISO_9001', 'BOTH', 'NONE');
CREATE TYPE "pia"."DocumentStatus" AS ENUM ('PENDING', 'UPLOADED', 'ACCEPTED', 'REJECTED');
CREATE TYPE "pia"."PaymentType" AS ENUM ('APPLICATION_FEE', 'ADDITIONAL_PORT_FEE', 'INSPECTION_FEE', 'ANNUAL_FEE');
CREATE TYPE "pia"."PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');
CREATE TYPE "pia"."NCStatus" AS ENUM ('OPEN', 'CLOSURE_SUBMITTED', 'CLOSED', 'RERAISED');
CREATE TYPE "pia"."DiscrepancyStatus" AS ENUM ('RAISED', 'RESPONDED', 'CLOSED');
CREATE TYPE "pia"."ModificationType" AS ENUM (
  'ADD_PORT', 'ADD_MINERAL_ORE', 'ADD_BRANCH_LOCATION', 'ADD_LABORATORY', 'CHANGE_SCOPE', 'OTHER'
);

-- Master tables
CREATE TABLE "pia"."pia_ports" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "state" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "pia_ports_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pia_ports_name_key" ON "pia"."pia_ports"("name");
CREATE UNIQUE INDEX "pia_ports_code_key" ON "pia"."pia_ports"("code");

CREATE TABLE "pia"."pia_mineral_ores" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "hsCode" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "pia_mineral_ores_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pia_mineral_ores_name_key" ON "pia"."pia_mineral_ores"("name");

-- Main application table
CREATE TABLE "pia"."pia_applications" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "subType" "pia"."PIASubType" NOT NULL DEFAULT 'NEW_RECOGNITION',
  "piaStatus" "pia"."PIAStatus" NOT NULL DEFAULT 'DRAFT',
  "agencyNameHindi" TEXT,
  "headOfficeAddress" TEXT,
  "headOfficeState" TEXT,
  "headOfficeDistrict" TEXT,
  "headOfficeCity" TEXT,
  "headOfficePincode" TEXT,
  "headOfficeCountry" TEXT DEFAULT 'India',
  "headOfficePhone" TEXT,
  "headOfficeFax" TEXT,
  "headOfficeEmail" TEXT,
  "headOfOrgName" TEXT,
  "headOfOrgDesignation" TEXT,
  "headOfOrgContact" TEXT,
  "legalStatus" "pia"."LegalStatusType",
  "legalStatusDetails" TEXT,
  "inspectionDivHeadName" TEXT,
  "inspectionDivHeadDesignation" TEXT,
  "inspectionDivPhone" TEXT,
  "inspectionDivEmail" TEXT,
  "labDivHeadName" TEXT,
  "labDivHeadDesignation" TEXT,
  "labDivPhone" TEXT,
  "labDivEmail" TEXT,
  "seniorMgmtCount" INTEGER,
  "inspectingStaffCount" INTEGER,
  "qmsImplemented" BOOLEAN NOT NULL DEFAULT false,
  "qmsType" "pia"."QMSType",
  "isAccredited" BOOLEAN NOT NULL DEFAULT false,
  "accreditationScope" TEXT,
  "accreditationBody" TEXT,
  "consultancyDetails" TEXT,
  "hasDomesticExperience" BOOLEAN NOT NULL DEFAULT false,
  "hasExportExperience" BOOLEAN NOT NULL DEFAULT false,
  "hasLaboratory" BOOLEAN NOT NULL DEFAULT false,
  "hasLabAccreditation" BOOLEAN NOT NULL DEFAULT false,
  "labAccreditationType" TEXT,
  "labAccreditationScope" TEXT,
  "labConsultancyDetails" TEXT,
  "hasOtherActivities" BOOLEAN NOT NULL DEFAULT false,
  "otherActivitiesDetails" TEXT,
  "hasLinkedOrganization" BOOLEAN NOT NULL DEFAULT false,
  "linkedOrgDetails" TEXT,
  "hasRelatedActivities" BOOLEAN NOT NULL DEFAULT false,
  "relatedActivitiesDetails" TEXT,
  "hasDisputesWithClients" BOOLEAN NOT NULL DEFAULT false,
  "disputesDetails" TEXT,
  "hasCriminalProceedings" BOOLEAN NOT NULL DEFAULT false,
  "criminalProceedingsDetails" TEXT,
  "recognitionPeriod" INTEGER,
  "recognitionValidityDate" TIMESTAMP(3),
  "existingRecognitionNo" TEXT,
  "modificationType" "pia"."ModificationType",
  "nominatedOfficerId" TEXT,
  "nominatedOfficerName" TEXT,
  "nominatedAt" TIMESTAMP(3),
  "inspectionScheduledDate" TIMESTAMP(3),
  "inspectionCompletedDate" TIMESTAMP(3),
  "finalRemarks" TEXT,
  "submittedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pia_applications_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pia_applications_applicationId_key" ON "pia"."pia_applications"("applicationId");

CREATE TABLE "pia"."pia_application_ports" (
  "id" TEXT NOT NULL,
  "piaApplicationId" TEXT NOT NULL,
  "portId" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "pia_application_ports_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pia_application_ports_piaApplicationId_portId_key" ON "pia"."pia_application_ports"("piaApplicationId", "portId");

CREATE TABLE "pia"."pia_application_scopes" (
  "id" TEXT NOT NULL,
  "piaApplicationId" TEXT NOT NULL,
  "mineralOreId" TEXT NOT NULL,
  "specifications" TEXT,
  CONSTRAINT "pia_application_scopes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pia_application_scopes_piaApplicationId_mineralOreId_key" ON "pia"."pia_application_scopes"("piaApplicationId", "mineralOreId");

CREATE TABLE "pia"."pia_branches" (
  "id" TEXT NOT NULL,
  "piaApplicationId" TEXT NOT NULL,
  "branchName" TEXT NOT NULL,
  "address" TEXT,
  "state" TEXT,
  "district" TEXT,
  "city" TEXT,
  "pincode" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "headOfBranchName" TEXT,
  "headOfBranchDesignation" TEXT,
  CONSTRAINT "pia_branches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pia"."pia_manpower" (
  "id" TEXT NOT NULL,
  "piaApplicationId" TEXT NOT NULL,
  "isSeniorMgmt" BOOLEAN NOT NULL DEFAULT false,
  "name" TEXT NOT NULL,
  "designation" TEXT NOT NULL,
  "qualification" TEXT,
  "experienceYears" INTEGER,
  "specialization" TEXT,
  CONSTRAINT "pia_manpower_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pia"."pia_lab_manpower" (
  "id" TEXT NOT NULL,
  "piaApplicationId" TEXT NOT NULL,
  "isSeniorMgmt" BOOLEAN NOT NULL DEFAULT false,
  "name" TEXT NOT NULL,
  "designation" TEXT NOT NULL,
  "qualification" TEXT,
  "experienceYears" INTEGER,
  CONSTRAINT "pia_lab_manpower_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pia"."pia_documents" (
  "id" TEXT NOT NULL,
  "piaApplicationId" TEXT NOT NULL,
  "documentType" TEXT NOT NULL,
  "documentName" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "filePath" TEXT NOT NULL,
  "fileSize" INTEGER,
  "mimeType" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "status" "pia"."DocumentStatus" NOT NULL DEFAULT 'UPLOADED',
  "rejectionReason" TEXT,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pia_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pia"."pia_discrepancies" (
  "id" TEXT NOT NULL,
  "piaApplicationId" TEXT NOT NULL,
  "raisedByUserId" TEXT,
  "raisedByName" TEXT,
  "documentType" TEXT,
  "description" TEXT NOT NULL,
  "status" "pia"."DiscrepancyStatus" NOT NULL DEFAULT 'RAISED',
  "applicantResponse" TEXT,
  "raisedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  CONSTRAINT "pia_discrepancies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pia"."pia_non_conformities" (
  "id" TEXT NOT NULL,
  "piaApplicationId" TEXT NOT NULL,
  "raisedByOfficerId" TEXT,
  "raisedByName" TEXT,
  "ncNumber" TEXT,
  "description" TEXT NOT NULL,
  "evidenceDetails" TEXT,
  "clauseReference" TEXT,
  "status" "pia"."NCStatus" NOT NULL DEFAULT 'OPEN',
  "closureDeadline" TIMESTAMP(3),
  "raisedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  CONSTRAINT "pia_non_conformities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pia"."pia_nc_closures" (
  "id" TEXT NOT NULL,
  "nonConformityId" TEXT NOT NULL,
  "submittedByUserId" TEXT,
  "closureResponse" TEXT NOT NULL,
  "attachmentPath" TEXT,
  "isAccepted" BOOLEAN,
  "reviewedByName" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewRemarks" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pia_nc_closures_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pia"."pia_inspection_reports" (
  "id" TEXT NOT NULL,
  "piaApplicationId" TEXT NOT NULL,
  "officerId" TEXT,
  "officerName" TEXT,
  "reportType" TEXT NOT NULL,
  "reportPath" TEXT,
  "observations" TEXT,
  "recommendation" TEXT,
  "proposedValidity" INTEGER,
  "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pia_inspection_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pia"."pia_payments" (
  "id" TEXT NOT NULL,
  "piaApplicationId" TEXT NOT NULL,
  "paymentType" "pia"."PaymentType" NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "gstAmount" DECIMAL(10,2),
  "totalAmount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "status" "pia"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "transactionId" TEXT,
  "gatewayOrderId" TEXT,
  "gatewayResponse" JSONB,
  "receiptNo" TEXT,
  "receiptPath" TEXT,
  "invoicePath" TEXT,
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pia_payments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pia_payments_transactionId_key" ON "pia"."pia_payments"("transactionId");
CREATE UNIQUE INDEX "pia_payments_receiptNo_key" ON "pia"."pia_payments"("receiptNo");

CREATE TABLE "pia"."pia_annual_fees" (
  "id" TEXT NOT NULL,
  "piaApplicationId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "status" "pia"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "transactionId" TEXT,
  "receiptPath" TEXT,
  "dueDate" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pia_annual_fees_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pia_annual_fees_piaApplicationId_year_key" ON "pia"."pia_annual_fees"("piaApplicationId", "year");

CREATE TABLE "pia"."pia_gazette" (
  "id" TEXT NOT NULL,
  "piaApplicationId" TEXT NOT NULL,
  "notificationHindi" TEXT,
  "notificationEnglish" TEXT,
  "preparedByName" TEXT,
  "preparedAt" TIMESTAMP(3),
  "sharedWithMinistryAt" TIMESTAMP(3),
  "applicantInformedAt" TIMESTAMP(3),
  "publicationDate" TIMESTAMP(3),
  "gazetteNo" TEXT,
  "gazetteFilePath" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pia_gazette_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pia_gazette_piaApplicationId_key" ON "pia"."pia_gazette"("piaApplicationId");

CREATE TABLE "pia"."pia_codes" (
  "id" TEXT NOT NULL,
  "piaApplicationId" TEXT NOT NULL,
  "piaCode" TEXT,
  "certificateNo" TEXT,
  "requestedAt" TIMESTAMP(3),
  "issuedAt" TIMESTAMP(3),
  "issuedByName" TEXT,
  "validFrom" TIMESTAMP(3),
  "validTo" TIMESTAMP(3),
  "certificatePath" TEXT,
  CONSTRAINT "pia_codes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pia_codes_piaApplicationId_key" ON "pia"."pia_codes"("piaApplicationId");
CREATE UNIQUE INDEX "pia_codes_piaCode_key" ON "pia"."pia_codes"("piaCode");
CREATE UNIQUE INDEX "pia_codes_certificateNo_key" ON "pia"."pia_codes"("certificateNo");

CREATE TABLE "pia"."pia_quarterly_statements" (
  "id" TEXT NOT NULL,
  "piaApplicationId" TEXT NOT NULL,
  "quarter" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "inspectionCount" INTEGER NOT NULL DEFAULT 0,
  "remarks" TEXT,
  "attachmentPath" TEXT,
  "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pia_quarterly_statements_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pia_quarterly_statements_piaApplicationId_quarter_year_key" ON "pia"."pia_quarterly_statements"("piaApplicationId", "quarter", "year");

CREATE TABLE "pia"."pia_fee_config" (
  "id" TEXT NOT NULL,
  "feeType" "pia"."PaymentType" NOT NULL,
  "label" TEXT NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pia_fee_config_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pia_fee_config_feeType_key" ON "pia"."pia_fee_config"("feeType");

CREATE TABLE "pia"."pia_document_checklist" (
  "id" TEXT NOT NULL,
  "subType" "pia"."PIASubType" NOT NULL,
  "documentType" TEXT NOT NULL,
  "documentLabel" TEXT NOT NULL,
  "description" TEXT,
  "isMandatory" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pia_document_checklist_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pia_document_checklist_subType_documentType_key" ON "pia"."pia_document_checklist"("subType", "documentType");

CREATE TABLE "pia"."pia_status_history" (
  "id" TEXT NOT NULL,
  "piaApplicationId" TEXT NOT NULL,
  "fromStatus" "pia"."PIAStatus",
  "toStatus" "pia"."PIAStatus" NOT NULL,
  "changedByUserId" TEXT,
  "changedByName" TEXT,
  "remarks" TEXT,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pia_status_history_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "pia"."pia_applications" ADD CONSTRAINT "pia_applications_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "public"."applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pia"."pia_application_ports" ADD CONSTRAINT "pia_application_ports_piaApplicationId_fkey"
  FOREIGN KEY ("piaApplicationId") REFERENCES "pia"."pia_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pia"."pia_application_ports" ADD CONSTRAINT "pia_application_ports_portId_fkey"
  FOREIGN KEY ("portId") REFERENCES "pia"."pia_ports"("id") ON UPDATE CASCADE;

ALTER TABLE "pia"."pia_application_scopes" ADD CONSTRAINT "pia_application_scopes_piaApplicationId_fkey"
  FOREIGN KEY ("piaApplicationId") REFERENCES "pia"."pia_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pia"."pia_application_scopes" ADD CONSTRAINT "pia_application_scopes_mineralOreId_fkey"
  FOREIGN KEY ("mineralOreId") REFERENCES "pia"."pia_mineral_ores"("id") ON UPDATE CASCADE;

ALTER TABLE "pia"."pia_branches" ADD CONSTRAINT "pia_branches_piaApplicationId_fkey"
  FOREIGN KEY ("piaApplicationId") REFERENCES "pia"."pia_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pia"."pia_manpower" ADD CONSTRAINT "pia_manpower_piaApplicationId_fkey"
  FOREIGN KEY ("piaApplicationId") REFERENCES "pia"."pia_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pia"."pia_lab_manpower" ADD CONSTRAINT "pia_lab_manpower_piaApplicationId_fkey"
  FOREIGN KEY ("piaApplicationId") REFERENCES "pia"."pia_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pia"."pia_documents" ADD CONSTRAINT "pia_documents_piaApplicationId_fkey"
  FOREIGN KEY ("piaApplicationId") REFERENCES "pia"."pia_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pia"."pia_discrepancies" ADD CONSTRAINT "pia_discrepancies_piaApplicationId_fkey"
  FOREIGN KEY ("piaApplicationId") REFERENCES "pia"."pia_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pia"."pia_non_conformities" ADD CONSTRAINT "pia_non_conformities_piaApplicationId_fkey"
  FOREIGN KEY ("piaApplicationId") REFERENCES "pia"."pia_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pia"."pia_nc_closures" ADD CONSTRAINT "pia_nc_closures_nonConformityId_fkey"
  FOREIGN KEY ("nonConformityId") REFERENCES "pia"."pia_non_conformities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pia"."pia_inspection_reports" ADD CONSTRAINT "pia_inspection_reports_piaApplicationId_fkey"
  FOREIGN KEY ("piaApplicationId") REFERENCES "pia"."pia_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pia"."pia_payments" ADD CONSTRAINT "pia_payments_piaApplicationId_fkey"
  FOREIGN KEY ("piaApplicationId") REFERENCES "pia"."pia_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pia"."pia_annual_fees" ADD CONSTRAINT "pia_annual_fees_piaApplicationId_fkey"
  FOREIGN KEY ("piaApplicationId") REFERENCES "pia"."pia_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pia"."pia_gazette" ADD CONSTRAINT "pia_gazette_piaApplicationId_fkey"
  FOREIGN KEY ("piaApplicationId") REFERENCES "pia"."pia_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pia"."pia_codes" ADD CONSTRAINT "pia_codes_piaApplicationId_fkey"
  FOREIGN KEY ("piaApplicationId") REFERENCES "pia"."pia_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pia"."pia_quarterly_statements" ADD CONSTRAINT "pia_quarterly_statements_piaApplicationId_fkey"
  FOREIGN KEY ("piaApplicationId") REFERENCES "pia"."pia_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pia"."pia_status_history" ADD CONSTRAINT "pia_status_history_piaApplicationId_fkey"
  FOREIGN KEY ("piaApplicationId") REFERENCES "pia"."pia_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
