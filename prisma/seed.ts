import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email    = 'admin@eic.gov.in';
  const password = 'Admin@1234';
  const name     = 'Super Administrator';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin already exists: ${email}`);
    return;
  }

  const hash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.create({
    data: { email, password: hash, name, role: 'ADMIN' },
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id, userName: admin.name, userEmail: admin.email,
      action: 'REGISTER', description: 'Super admin account initialised',
    },
  });

  console.log('✓ Admin user created');
  console.log(`  Email    : ${email}`);
  console.log(`  Password : ${password}`);
}

async function seedStatusMaster() {
  const statuses = [
    { code: 'DRAFT',                         label: 'Draft',                         phase: 'Application',   sortOrder: 1,  description: 'Application is being filled out by the applicant.' },
    { code: 'SUBMITTED',                     label: 'Submitted',                     phase: 'Application',   sortOrder: 2,  description: 'Application submitted for processing.' },
    { code: 'APPLICATION_FEE_PENDING',       label: 'Application Fee Pending',       phase: 'Application',   sortOrder: 3,  description: 'Awaiting payment of the application fee.' },
    { code: 'APPLICATION_FEE_PAID',          label: 'Application Fee Paid',          phase: 'Application',   sortOrder: 4,  description: 'Application fee has been received and confirmed.' },
    { code: 'RECEIVED_BY_EIA',               label: 'Received by EIA',               phase: 'Scrutiny',      sortOrder: 5,  description: 'Application received and acknowledged by the EIA office.' },
    { code: 'FORWARDED_TO_EIC',              label: 'Forwarded to EIC',              phase: 'Scrutiny',      sortOrder: 6,  description: 'Application forwarded from EIA to EIC for further processing.' },
    { code: 'UNDER_DOCUMENT_SCRUTINY',       label: 'Under Document Scrutiny',       phase: 'Scrutiny',      sortOrder: 7,  description: 'Documents and application data under review by EIC.' },
    { code: 'DISCREPANCY_RAISED',            label: 'Discrepancy Raised',            phase: 'Scrutiny',      sortOrder: 8,  description: 'Issues or discrepancies found in the submitted documents.' },
    { code: 'RESUBMITTED_BY_APPLICANT',      label: 'Resubmitted by Applicant',      phase: 'Scrutiny',      sortOrder: 9,  description: 'Applicant has responded to discrepancies and resubmitted.' },
    { code: 'SCRUTINY_COMPLETED',            label: 'Scrutiny Completed',            phase: 'Scrutiny',      sortOrder: 10, description: 'Document scrutiny has been completed successfully.' },
    { code: 'INSPECTION_OFFICER_NOMINATED',  label: 'Inspection Officer Nominated',  phase: 'Inspection',    sortOrder: 11, description: 'An inspection officer has been nominated for the physical audit.' },
    { code: 'INSPECTION_FEE_PENDING',        label: 'Inspection Fee Pending',        phase: 'Inspection',    sortOrder: 12, description: 'Awaiting payment of the inspection / audit fee.' },
    { code: 'INSPECTION_FEE_PAID',           label: 'Inspection Fee Paid',           phase: 'Inspection',    sortOrder: 13, description: 'Inspection fee has been received and confirmed.' },
    { code: 'INSPECTION_SCHEDULED',          label: 'Inspection Scheduled',          phase: 'Inspection',    sortOrder: 14, description: 'Physical inspection / audit has been scheduled.' },
    { code: 'INSPECTION_COMPLETED',          label: 'Inspection Completed',          phase: 'Inspection',    sortOrder: 15, description: 'Physical inspection / audit has been conducted.' },
    { code: 'NON_CONFORMITY_RAISED',         label: 'Non-Conformity Raised',         phase: 'Inspection',    sortOrder: 16, description: 'Non-conformities identified during the inspection audit.' },
    { code: 'CLOSURE_SUBMITTED',             label: 'Closure Submitted',             phase: 'Inspection',    sortOrder: 17, description: 'Applicant submitted closure response for non-conformities.' },
    { code: 'CLOSURE_UNDER_REVIEW',          label: 'Closure Under Review',          phase: 'Inspection',    sortOrder: 18, description: 'Closure response is being reviewed by the inspection officer.' },
    { code: 'REPORT_SUBMITTED_TO_EIC',       label: 'Report Submitted to EIC',       phase: 'Final Review',  sortOrder: 19, description: 'Inspection report submitted by officer to EIC for final review.' },
    { code: 'UNDER_FINAL_REVIEW',            label: 'Under Final Review',            phase: 'Final Review',  sortOrder: 20, description: 'EIC committee is conducting the final review of the application.' },
    { code: 'APPROVED_BY_EIC',               label: 'Approved by EIC',               phase: 'Final Review',  sortOrder: 21, description: 'Application approved by EIC. Recognition to be granted.' },
    { code: 'REJECTED',                      label: 'Rejected',                      phase: 'Final Review',  sortOrder: 22, description: 'Application rejected by EIC.' },
    { code: 'GAZETTE_NOTIFICATION_PREPARED', label: 'Gazette Notification Prepared', phase: 'Post-Approval', sortOrder: 23, description: 'Gazette notification in Hindi and English has been prepared.' },
    { code: 'SHARED_WITH_MINISTRY',          label: 'Shared with Ministry',          phase: 'Post-Approval', sortOrder: 24, description: 'Gazette notification shared with the Ministry for publication.' },
    { code: 'ANNUAL_FEE_PENDING',            label: 'Annual Fee Pending',            phase: 'Post-Approval', sortOrder: 25, description: 'Annual recognition fee is due from the PIA.' },
    { code: 'ANNUAL_FEE_PAID',               label: 'Annual Fee Paid',               phase: 'Post-Approval', sortOrder: 26, description: 'Annual recognition fee has been received.' },
    { code: 'GAZETTE_PUBLISHED',             label: 'Gazette Published',             phase: 'Post-Approval', sortOrder: 27, description: 'Gazette notification has been officially published.' },
    { code: 'PIA_CODE_REQUESTED',            label: 'PIA Code Requested',            phase: 'Post-Approval', sortOrder: 28, description: 'Request raised for generation of the PIA recognition code.' },
    { code: 'PIA_CODE_GENERATED',            label: 'PIA Code Generated',            phase: 'Post-Approval', sortOrder: 29, description: 'PIA recognition code and certificate have been issued.' },
    { code: 'ACTIVE',                        label: 'Active',                        phase: 'Lifecycle',     sortOrder: 30, description: 'PIA recognition is active and valid.' },
    { code: 'RENEWAL_DUE',                   label: 'Renewal Due',                   phase: 'Lifecycle',     sortOrder: 31, description: 'PIA recognition is approaching expiry and renewal is due.' },
    { code: 'RENEWED',                       label: 'Renewed',                       phase: 'Lifecycle',     sortOrder: 32, description: 'PIA recognition has been successfully renewed.' },
    { code: 'MODIFICATION_UNDER_PROCESS',    label: 'Modification Under Process',    phase: 'Lifecycle',     sortOrder: 33, description: 'A modification request is being processed.' },
    { code: 'SUSPENDED',                     label: 'Suspended',                     phase: 'Lifecycle',     sortOrder: 34, description: 'PIA recognition has been suspended pending investigation.' },
    { code: 'EXPIRED',                       label: 'Expired',                       phase: 'Lifecycle',     sortOrder: 35, description: 'PIA recognition has expired.' },
    { code: 'WITHDRAWN',                     label: 'Withdrawn',                     phase: 'Lifecycle',     sortOrder: 36, description: 'Application or recognition has been withdrawn.' },
  ];

  for (const s of statuses) {
    await prisma.pIAStatusMaster.upsert({
      where: { code: s.code },
      create: s,
      update: { label: s.label, phase: s.phase, sortOrder: s.sortOrder, description: s.description },
    });
  }
  console.log(`✓ PIAStatusMaster seeded (${statuses.length} statuses)`);
}

main()
  .then(() => seedStatusMaster())
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
