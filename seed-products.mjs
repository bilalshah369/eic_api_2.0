import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const products = [
  { name: 'Fish & Fishery Products - EU', category: 'Fish & Fishery Products', sortOrder: 1 },
  { name: 'Fish & Fishery Products - Non EU', category: 'Fish & Fishery Products', sortOrder: 2 },
  { name: 'Fish & Fishery Products - USA', category: 'Fish & Fishery Products', sortOrder: 3 },
  { name: 'Fish & Fishery Products - Japan', category: 'Fish & Fishery Products', sortOrder: 4 },
  { name: 'Fish & Fishery Products - China', category: 'Fish & Fishery Products', sortOrder: 5 },
  { name: 'Fish & Fishery Products - Korea', category: 'Fish & Fishery Products', sortOrder: 6 },
  { name: 'Fish & Fishery Products - Vietnam', category: 'Fish & Fishery Products', sortOrder: 7 },
  { name: 'Egg & Egg Products - EU', category: 'Egg & Egg Products', sortOrder: 1 },
  { name: 'Egg & Egg Products - Non EU', category: 'Egg & Egg Products', sortOrder: 2 },
  { name: 'Dairy Products - EU', category: 'Dairy Products', sortOrder: 1 },
  { name: 'Dairy Products - Non EU', category: 'Dairy Products', sortOrder: 2 },
  { name: 'Meat & Meat Products - EU', category: 'Meat & Meat Products', sortOrder: 1 },
  { name: 'Meat & Meat Products - Non EU', category: 'Meat & Meat Products', sortOrder: 2 },
  { name: 'Honey - EU', category: 'Honey', sortOrder: 1 },
  { name: 'Honey - Non EU', category: 'Honey', sortOrder: 2 },
  { name: 'Fruits & Vegetables - EU', category: 'Fruits & Vegetables', sortOrder: 1 },
  { name: 'Fruits & Vegetables - USA', category: 'Fruits & Vegetables', sortOrder: 2 },
  { name: 'Organic Products - EU', category: 'Organic Products', sortOrder: 1 },
  { name: 'Organic Products - USA', category: 'Organic Products', sortOrder: 2 },
  { name: 'Spices - EU', category: 'Spices', sortOrder: 1 },
  { name: 'Spices - Non EU', category: 'Spices', sortOrder: 2 },
  { name: 'Rice - All Markets', category: 'Rice', sortOrder: 1 },
  { name: 'General Certificate', category: 'General', sortOrder: 1 },
  { name: 'Health Certificate', category: 'General', sortOrder: 2 },
];

let count = 0;
for (const p of products) {
  await prisma.certificateProduct.upsert({
    where: { name: p.name },
    create: p,
    update: p,
  });
  count++;
}
console.log('Seeded', count, 'certificate products');
await prisma.$disconnect();
