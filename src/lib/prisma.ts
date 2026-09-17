import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { CONNECT_RETRY_DELAYS_MS, isConnectionRefusal } from "@/lib/db-retry";

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

  // Every query goes through this once, so a database that is waking up (or
  // a pool that is momentarily full) is retried in one place rather than at
  // each of the dozens of call sites. Only failures from before the statement
  // was sent qualify — see isConnectionRefusal — which is what makes retrying
  // a write here safe. A query inside an interactive transaction that fails
  // this way fails the transaction with it; the retry then throws the
  // transaction's own error, which is the right outcome.
  return new PrismaClient({ adapter }).$extends({
    name: "connect-retry",
    query: {
      async $allOperations({ model, operation, args, query }) {
        for (let attempt = 0; ; attempt++) {
          try {
            return await query(args);
          } catch (error) {
            if (!isConnectionRefusal(error) || attempt >= CONNECT_RETRY_DELAYS_MS.length) throw error;
            const wait = CONNECT_RETRY_DELAYS_MS[attempt];
            console.warn(
              `[db-retry] ${model ?? "raw"}.${operation}: database not reachable on attempt ${attempt + 1}/${CONNECT_RETRY_DELAYS_MS.length + 1}, retrying in ${wait} ms`
            );
            await new Promise((resolve) => setTimeout(resolve, wait));
          }
        }
      },
    },
  });
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
