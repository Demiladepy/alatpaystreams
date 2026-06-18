import { PrismaClient, BucketType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const merchant = await prisma.merchant.upsert({
    where: { phone: '+2348012345678' },
    update: {
      alatpayAccountId: 'alatpay_funke_001',
      name: 'Funke Adebayo Beauty Ltd',
    },
    create: {
      name: 'Funke Adebayo Beauty Ltd',
      phone: '+2348012345678',
      email: 'funke@adebayokitchen.ng',
      alatpayAccountId: 'alatpay_funke_001',
    },
  });

  await prisma.bucket.deleteMany({ where: { merchantId: merchant.id } });

  const buckets: Array<{
    name: string;
    type: BucketType;
    rule: object;
    priority: number;
  }> = [
    { name: 'VAT Reserve', type: 'TAX', rule: { kind: 'PERCENTAGE', value: 7.5 }, priority: 1 },
    { name: 'Emergency Savings', type: 'SAVINGS', rule: { kind: 'PERCENTAGE', value: 10 }, priority: 2 },
    { name: 'Supplier Payment', type: 'SUPPLIER', rule: { kind: 'FIXED', value: 5000 }, priority: 3 },
    { name: 'Owner Salary', type: 'OWNER_SALARY', rule: { kind: 'PERCENTAGE', value: 40 }, priority: 4 },
  ];

  for (const bucket of buckets) {
    await prisma.bucket.create({
      data: { merchantId: merchant.id, ...bucket },
    });
  }

  console.log('Seeded merchant:', merchant.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
