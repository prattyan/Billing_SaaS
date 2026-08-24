const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.qambksptpdwvpfhducgr:bN76vlwBIUTO48Pa@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=5',
    },
  },
});

async function main() {
  await prisma.$executeRawUnsafe('ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false;');
  await prisma.$executeRawUnsafe('ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);');
  await prisma.$executeRawUnsafe('ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "scheduledDeletionAt" TIMESTAMP(3);');
  console.log('✅ Columns added successfully to tenants table!');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  });
