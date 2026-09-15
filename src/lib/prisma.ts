import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  // Deliberately loud: the MariaDB version fell back to 127.0.0.1:3307, which on
  // production meant a missing env var still booted the app — pointed at nothing,
  // reported as a database outage. There is no sensible local default here.
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  // Aiven terminates TLS with its own CA, so the cert travels in an env var
  // rather than living in the repo. Absent locally, where the connection never
  // leaves the machine.
  const ca = process.env.DATABASE_CA_CERT;

  // Aiven's URI ends in ?sslmode=require, and pg lets the URL win: it parses
  // the string over the options it was given, so `sslmode` in the URL turned
  // the `ssl` block below into a bare {} and the CA was never used — every
  // query failed with "self-signed certificate in certificate chain". With a
  // CA in hand the URL's mode is dropped and TLS is configured explicitly.
  // Without one the URL is passed as-is, so a hosted database still fails
  // loudly rather than silently connecting unverified.
  const url = new URL(connectionString);
  if (ca) url.searchParams.delete("sslmode");

  const adapter = new PrismaPg({
    connectionString: url.toString(),
    ssl: ca ? { ca, rejectUnauthorized: true } : undefined,
    // Not the 20 the MariaDB pool used. A PostgreSQL connection is far more
    // expensive and Aiven's smaller plans cap max_connections low enough that a
    // single over-eager pool can exhaust the server. Raise via env if measured.
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
  });

  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma_v4: ReturnType<typeof createPrismaClient> | undefined;
};

// v4: bumped from prisma_v3 so a dev server that was holding the MariaDB-backed
// client across HMR builds a new one instead of reusing a client bound to an
// adapter that no longer matches the schema.
export const prisma = globalForPrisma.prisma_v4 ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma_v4 = prisma;
}
