import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../src/generated/prisma/client';
import type { UserRole } from '@questly/shared-types';

const adapter = new PrismaPg(process.env['DATABASE_URL']!);
const prisma = new PrismaClient({ adapter });

const ROLES: readonly UserRole[] = ['admin', 'author', 'student', 'educator'];

// Dev-only fixtures: one login per role, all password "password123".
const DEMO_USERS: ReadonlyArray<{ role: UserRole; email: string; name: string }> = [
  { role: 'admin', email: 'admin@questly.dev', name: 'Demo Admin' },
  { role: 'author', email: 'author@questly.dev', name: 'Demo Author' },
  { role: 'student', email: 'student@questly.dev', name: 'Demo Student' },
  { role: 'educator', email: 'educator@questly.dev', name: 'Demo Educator' },
];
const DEMO_PASSWORD = 'password123';

async function main() {
  for (const name of ROLES) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  for (const demoUser of DEMO_USERS) {
    const role = await prisma.role.findUniqueOrThrow({
      where: { name: demoUser.role },
    });
    await prisma.user.upsert({
      where: { email: demoUser.email },
      update: {},
      create: {
        email: demoUser.email,
        name: demoUser.name,
        passwordHash,
        roleId: role.id,
        subjects: [],
      },
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
