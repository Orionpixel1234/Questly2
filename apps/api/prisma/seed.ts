import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import type { UserRole } from '../src/shared-types';

const adapter = new PrismaPg(process.env['DATABASE_URL']!);
const prisma = new PrismaClient({ adapter });

const ROLES: readonly UserRole[] = ['admin', 'author', 'student', 'educator'];

async function main() {
  for (const name of ROLES) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
