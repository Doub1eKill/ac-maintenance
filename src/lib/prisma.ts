import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL || "mysql://root@127.0.0.1:3307/ac_maintenance";
  const parsed = new URL(dbUrl.replace(/^mysql:\/\//, "http://").replace(/^mariadb:\/\//, "http://"));

  const adapter = new PrismaMariaDb({
    host: parsed.hostname === "localhost" ? "127.0.0.1" : parsed.hostname || "127.0.0.1",
    port: parsed.port ? parseInt(parsed.port, 10) : 3307,
    user: parsed.username || "root",
    password: parsed.password || "",
    database: parsed.pathname.replace(/^\//, "") || "ac_maintenance",
    connectionLimit: 20,
  });

  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma_v3: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma_v3 ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma_v3 = prisma;
}
