-- Refused sign-ins, for throttling password guesses (see LoginFailure in
-- schema.prisma). Additive only: no existing table is touched.
CREATE TABLE "login_failures" (
    "id" BIGSERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "ip" VARCHAR(64),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_failures_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "login_failures_email_created_at_index" ON "login_failures"("email", "created_at");

CREATE INDEX "login_failures_ip_created_at_index" ON "login_failures"("ip", "created_at");
