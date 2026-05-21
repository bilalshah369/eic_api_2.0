/**
 * Master data seed — EIA offices and their Sub-Offices (SO → SUB_EIA).
 * Idempotent: uses upsert keyed on `code`, safe to re-run at any time.
 *
 * Run:  npx ts-node prisma/seed-offices.ts
 */
import { PrismaClient, OfficeType } from '@prisma/client';

const prisma = new PrismaClient();

// ─── EIA offices ───────────────────────────────────────────────────────────
const EIA_OFFICES: { name: string; code: string }[] = [
  { name: 'EIA - CHENNAI',  code: 'CHE' },
  { name: 'EIA - DELHI',    code: 'DEL' },
  { name: 'EIA - KOCHI',    code: 'KOC' },
  { name: 'EIA - KOLKATA',  code: 'KOL' },
  { name: 'EIA - MUMBAI',   code: 'MUM' },
];

// ─── Sub-Offices — keyed by their parent EIA code ──────────────────────────
const SUB_OFFICES: Record<string, { name: string; code: string }[]> = {
  CHE: [
    { name: 'SO - BHIMAVARAM',    code: 'BVM' },
    { name: 'SO - COIMBATORE',    code: 'COI' },
    { name: 'SO - HYDERABAD',     code: 'HYD' },
    { name: 'SO - NAGERCOIL',     code: 'NGL' },
    { name: 'SO - NELLORE',       code: 'NLR' },
    { name: 'SO - TUTICORIN',     code: 'TTN' },
    { name: 'SO - VISAKHAPATNAM', code: 'VSP' },
  ],
  DEL: [
    { name: 'SO - INDORE',    code: 'IND' },
    { name: 'SO - JAIPUR',    code: 'JAI' },
    { name: 'SO - JALANDHAR', code: 'JAL' },
    { name: 'SO - KANPUR',    code: 'KAN' },
    { name: 'SO - LUDHIANA',  code: 'LUD' },
  ],
  KOC: [
    { name: 'SO - BANGALORE', code: 'BLG' },
    { name: 'SO - MANGALORE', code: 'MNG' },
    { name: 'SO - QUILON',    code: 'KLM' },
  ],
  KOL: [
    { name: 'SO - BHUBANESWAR', code: 'BBS' },
  ],
  MUM: [
    { name: 'SO - AHMEDABAD',  code: 'AHM' },
    { name: 'SO - BARODA',     code: 'VAD' },
    { name: 'SO - GANDHIDHAM', code: 'GAN' },
    { name: 'SO - GOA',        code: 'PAN' },
    { name: 'SO - PORBANDAR',  code: 'POR' },
    { name: 'SO - RAJKOT',     code: 'RAJ' },
    { name: 'SO - RATNAGIRI',  code: 'RAT' },
    { name: 'SO - VERAVAL',    code: 'VER' },
  ],
};

async function main() {
  console.log('Seeding EIA offices…');

  // 1. Upsert all EIA offices first — we need their IDs for the sub-offices
  const eiaIdMap: Record<string, string> = {};

  for (const eia of EIA_OFFICES) {
    const record = await prisma.office.upsert({
      where:  { code: eia.code },
      update: { name: eia.name, type: OfficeType.EIA },
      create: { name: eia.name, code: eia.code, type: OfficeType.EIA },
    });
    eiaIdMap[eia.code] = record.id;
    console.log(`  ✓ EIA  ${eia.code}  ${eia.name}`);
  }

  // 2. Upsert all sub-offices, linking to their parent EIA
  console.log('\nSeeding Sub-Offices (SO → SUB_EIA)…');

  for (const [parentCode, subList] of Object.entries(SUB_OFFICES)) {
    const parentId = eiaIdMap[parentCode];
    if (!parentId) {
      console.warn(`  ✗ Parent EIA ${parentCode} not found — skipping its sub-offices`);
      continue;
    }

    for (const sub of subList) {
      await prisma.office.upsert({
        where:  { code: sub.code },
        update: { name: sub.name, type: OfficeType.SUB_EIA, parentId },
        create: { name: sub.name, code: sub.code, type: OfficeType.SUB_EIA, parentId },
      });
      console.log(`  ✓ SO    ${sub.code}  ${sub.name}  (parent: ${parentCode})`);
    }
  }

  const total = EIA_OFFICES.length + Object.values(SUB_OFFICES).flat().length;
  console.log(`\nDone — ${total} offices seeded.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
