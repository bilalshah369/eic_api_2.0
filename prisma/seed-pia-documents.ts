import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DOCUMENTS = [
  { code: 'a', label: 'Quality Manual 17025',                                                                                              isRequired: true,  sortOrder: 1  },
  { code: 'b', label: 'Quality Manual 17020',                                                                                              isRequired: true,  sortOrder: 2  },
  { code: 'c', label: 'Sample of the Inspection Certificate(s) and Test reports(s), if any',                                               isRequired: false, sortOrder: 3  },
  { code: 'd', label: 'Information as per formats given in Annexure-1 to Annex-9 of the application.',                                     isRequired: true,  sortOrder: 4  },
  { code: 'e', label: 'Accreditation/EIC approval/recognition certificate no & date along with its scope',                                 isRequired: true,  sortOrder: 5  },
  { code: 'g', label: 'Details of the Application fee along with copy of fee receipt',                                                     isRequired: true,  sortOrder: 6  },
  { code: 'h', label: 'Legal Status of the IA such as Certificate of Incorporation, Memorandum and Article of Association',                isRequired: true,  sortOrder: 7  },
  { code: 'i', label: 'Address Proofs of all the locations i.e. Concerned Office Address, Crushing Shades Address, Laboratory Address etc.', isRequired: true, sortOrder: 8 },
  { code: 'j', label: 'List of crushing equipment',                                                                                        isRequired: true,  sortOrder: 9  },
  { code: 'k', label: 'Name and address of the IA in Hindi for the purpose of Hindi notification',                                         isRequired: true,  sortOrder: 10 },
  { code: 'l', label: 'Any other such as notification of recognition (Please specify)',                                                     isRequired: false, sortOrder: 11 },
];

async function main() {
  console.log('Seeding PIA document master…');
  for (const doc of DOCUMENTS) {
    await prisma.pIADocumentMaster.upsert({
      where: { code: doc.code },
      update: { label: doc.label, isRequired: doc.isRequired, sortOrder: doc.sortOrder },
      create: { code: doc.code, label: doc.label, isRequired: doc.isRequired, sortOrder: doc.sortOrder },
    });
  }
  console.log(`✓ Seeded ${DOCUMENTS.length} documents`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
