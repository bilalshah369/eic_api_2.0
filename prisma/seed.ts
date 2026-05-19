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

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
