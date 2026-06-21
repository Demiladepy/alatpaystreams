import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$queryRaw`SELECT 1`;
  const count = await prisma.merchant.count();
  console.log(`PG_OK merchants=${count}`);
}

main()
  .catch((err) => {
    console.error('PG_ERR', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
