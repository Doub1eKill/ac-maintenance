import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// Prisma 7 requires an explicit driver adapter for MySQL/MariaDB — the
// `datasource.url` in prisma.config.ts only feeds the CLI/Migrate tooling,
// not the runtime PrismaClient. The adapter takes the connection string
// directly, so this is the one place DATABASE_URL is actually used at runtime.
function createPrismaClient() {
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
  return new PrismaClient({ adapter });
}

// Next.js dev mode hot-reloads modules on every file save, which would
// otherwise create a fresh PrismaClient (and a fresh connection pool) per
// reload until connections are exhausted. Caching the instance on
// `globalThis` survives module reloads in dev while staying a plain
// per-process singleton in production.
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
