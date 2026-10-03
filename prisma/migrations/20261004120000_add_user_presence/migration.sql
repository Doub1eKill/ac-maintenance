-- Presence for the team page's Online/Offline badge (see User in
-- schema.prisma and src/lib/presence.ts). Additive and nullable: existing rows
-- read NULL, which counts as Offline until the person next signs in.
ALTER TABLE "users" ADD COLUMN "last_seen_at" TIMESTAMP(0),
ADD COLUMN "signed_out_at" TIMESTAMP(0);
