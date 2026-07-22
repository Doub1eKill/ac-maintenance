// One-off script for the Laravel -> Next.js/NextAuth migration.
// Every existing user's Laravel bcrypt hash is cleared to NULL, which this
// app treats as "must reset password" (see the comment on User.password in
// schema.prisma) — Laravel's bcrypt hashes can't be verified against a
// password without carrying over Laravel-specific bcrypt cost/config, so
// there's no safe way to keep them usable under the new auth system.
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import "dotenv/config";

async function main() {
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
  const prisma = new PrismaClient({ adapter });

  const before = await prisma.user.count({ where: { password: { not: null } } });
  console.log(`Users with a legacy password set: ${before}`);

  const result = await prisma.user.updateMany({
    where: { password: { not: null } },
    data: { password: null },
  });

  const after = await prisma.user.count({ where: { password: { not: null } } });
  const total = await prisma.user.count();

  console.log(`Cleared ${result.count} legacy password hash(es).`);
  console.log(`Users still with a password set (should be 0): ${after}`);
  console.log(`Total users (should be unchanged): ${total}`);

  await prisma.$disconnect();
}

main();
