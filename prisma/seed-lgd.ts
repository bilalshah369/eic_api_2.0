import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STATES = [
  { id: 1,  name: 'Andhra Pradesh',              code: 'AP' },
  { id: 2,  name: 'Arunachal Pradesh',            code: 'AR' },
  { id: 3,  name: 'Assam',                        code: 'AS' },
  { id: 4,  name: 'Bihar',                        code: 'BR' },
  { id: 5,  name: 'Chhattisgarh',                 code: 'CG' },
  { id: 6,  name: 'Goa',                          code: 'GA' },
  { id: 7,  name: 'Gujarat',                      code: 'GJ' },
  { id: 8,  name: 'Haryana',                      code: 'HR' },
  { id: 9,  name: 'Himachal Pradesh',             code: 'HP' },
  { id: 10, name: 'Jharkhand',                    code: 'JH' },
  { id: 11, name: 'Karnataka',                    code: 'KA' },
  { id: 12, name: 'Kerala',                       code: 'KL' },
  { id: 13, name: 'Madhya Pradesh',               code: 'MP' },
  { id: 14, name: 'Maharashtra',                  code: 'MH' },
  { id: 15, name: 'Manipur',                      code: 'MN' },
  { id: 16, name: 'Meghalaya',                    code: 'ML' },
  { id: 17, name: 'Mizoram',                      code: 'MZ' },
  { id: 18, name: 'Nagaland',                     code: 'NL' },
  { id: 19, name: 'Odisha',                       code: 'OD' },
  { id: 20, name: 'Punjab',                       code: 'PB' },
  { id: 21, name: 'Rajasthan',                    code: 'RJ' },
  { id: 22, name: 'Sikkim',                       code: 'SK' },
  { id: 23, name: 'Tamil Nadu',                   code: 'TN' },
  { id: 24, name: 'Telangana',                    code: 'TS' },
  { id: 25, name: 'Tripura',                      code: 'TR' },
  { id: 26, name: 'Uttar Pradesh',                code: 'UP' },
  { id: 27, name: 'Uttarakhand',                  code: 'UK' },
  { id: 28, name: 'West Bengal',                  code: 'WB' },
  // Union Territories
  { id: 29, name: 'Andaman and Nicobar Islands',  code: 'AN' },
  { id: 30, name: 'Chandigarh',                   code: 'CH' },
  { id: 31, name: 'Dadra and Nagar Haveli and Daman and Diu', code: 'DN' },
  { id: 32, name: 'Delhi',                        code: 'DL' },
  { id: 33, name: 'Jammu and Kashmir',            code: 'JK' },
  { id: 34, name: 'Ladakh',                       code: 'LA' },
  { id: 35, name: 'Lakshadweep',                  code: 'LD' },
  { id: 36, name: 'Puducherry',                   code: 'PY' },
];

async function main() {
  console.log('Seeding LGD states...');

  for (const state of STATES) {
    await prisma.lGDState.upsert({
      where: { id: state.id },
      update: { name: state.name, code: state.code },
      create: { id: state.id, name: state.name, code: state.code },
    });
  }

  console.log(`✓ Seeded ${STATES.length} states`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
