import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DOCS = [
  {
    documentType: 'QUALITY_MANUAL_QMS',
    documentLabel: 'Quality Manual / Quality Management System documents',
    description: 'Mandatory upload.',
    isMandatory: true,
    sortOrder: 1,
  },
  {
    documentType: 'INSPECTION_CERT_SAMPLE',
    documentLabel: 'Inspection certificate sample and test reports, if any',
    description: 'Upload as applicable.',
    isMandatory: false,
    sortOrder: 2,
  },
  {
    documentType: 'DECLARATION_ANNEXURE',
    documentLabel: 'Declaration as per prescribed annexure',
    description: 'Mandatory declaration upload or e-sign declaration.',
    isMandatory: true,
    sortOrder: 3,
  },
  {
    documentType: 'ACCREDITATION_CERT',
    documentLabel: 'Accreditation/approval/recognition certificate with scope and date',
    description: 'Upload certificate and scope.',
    isMandatory: true,
    sortOrder: 4,
  },
  {
    documentType: 'OTHER_INFO_CERT',
    documentLabel: 'Any other information or recognition certificate',
    description: 'Upload optional/additional documents.',
    isMandatory: false,
    sortOrder: 5,
  },
  {
    documentType: 'APPLICATION_FEE_PROOF',
    documentLabel: 'Application fee proof / online payment receipt',
    description: 'System generated after online payment.',
    isMandatory: true,
    sortOrder: 6,
  },
  {
    documentType: 'ISO_17020_MANUAL',
    documentLabel: 'ISO 17020 manual',
    description: 'Upload required.',
    isMandatory: true,
    sortOrder: 7,
  },
  {
    documentType: 'ISO_17025_MANUAL',
    documentLabel: 'ISO 17025 manual',
    description: 'Upload required wherever laboratory capability is applicable.',
    isMandatory: false,
    sortOrder: 8,
  },
  {
    documentType: 'LEGAL_STATUS_DOCS',
    documentLabel: 'Legal status documents',
    description: 'Mandatory upload. Certificate of Incorporation / Partnership Deed / MOA / Trust Deed.',
    isMandatory: true,
    sortOrder: 9,
  },
  {
    documentType: 'ADDRESS_PROOF',
    documentLabel: 'Address proofs for all locations',
    description: 'Head office, concerned office, crushing sheds, laboratory, and other relevant locations.',
    isMandatory: true,
    sortOrder: 10,
  },
  {
    documentType: 'HINDI_NAME_ADDRESS',
    documentLabel: 'Hindi name and address of inspection agency',
    description: 'Required for Hindi notification.',
    isMandatory: true,
    sortOrder: 11,
  },
  {
    documentType: 'CRIMINAL_PROCEEDINGS',
    documentLabel: 'Criminal/civil proceedings affidavit or equivalent document',
    description: 'Mandatory where applicable.',
    isMandatory: true,
    sortOrder: 12,
  },
];

const SUB_TYPES = ['NEW_RECOGNITION', 'RENEWAL', 'MODIFICATION'] as const;

// Old documentType keys from previous seed — clean them up
const OLD_KEYS = [
  'QUALITY_MANUAL_17025', 'QUALITY_MANUAL_17020', 'ANNEXURE_1_TO_9',
  'APPLICATION_FEE_RECEIPT', 'NAME_ADDRESS_HINDI', 'OTHER_DOCS',
  'CRUSHING_EQUIPMENT_LIST',
];

async function main() {
  console.log('Cleaning up old entries…');
  for (const subType of SUB_TYPES) {
    for (const documentType of OLD_KEYS) {
      await prisma.pIADocumentChecklist.deleteMany({ where: { subType, documentType } }).catch(() => null);
    }
  }

  console.log('Seeding PIA document checklist (official 12-item list)…');
  let count = 0;
  for (const subType of SUB_TYPES) {
    for (const doc of DOCS) {
      await prisma.pIADocumentChecklist.upsert({
        where: { subType_documentType: { subType, documentType: doc.documentType } },
        update: {
          documentLabel: doc.documentLabel,
          description: doc.description,
          isMandatory: doc.isMandatory,
          sortOrder: doc.sortOrder,
        },
        create: {
          subType,
          documentType: doc.documentType,
          documentLabel: doc.documentLabel,
          description: doc.description,
          isMandatory: doc.isMandatory,
          sortOrder: doc.sortOrder,
        },
      });
      count++;
    }
  }
  console.log(`✓ Seeded ${count} entries (${DOCS.length} docs × ${SUB_TYPES.length} sub-types)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
