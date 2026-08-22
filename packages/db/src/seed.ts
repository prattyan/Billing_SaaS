import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Initializing clean database with Super Admin...');

  const superAdminPassword = await bcrypt.hash('SuperAdmin@123', 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@billingsaas.com' },
    update: {
      passwordHash: superAdminPassword,
      isActive: true,
      role: 'SUPER_ADMIN',
    },
    create: {
      email: 'admin@billingsaas.com',
      name: 'Super Admin',
      passwordHash: superAdminPassword,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  console.log(`✅ Super Admin created / verified: ${superAdmin.email}`);
  console.log('🚀 Zero static / demo data seeded. All data will be created live in real-time!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
