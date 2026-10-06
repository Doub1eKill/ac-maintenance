-- Field LCP samples for the TTACON 2026 paper (see WebVitalSample in schema.prisma).
-- TEMPORARY and stand-alone: no foreign keys, nothing that identifies a person.
-- Prisma stamps created_at client-side in UTC; the column default is not used.
-- CreateTable
CREATE TABLE "web_vital_samples" (
    "id" BIGSERIAL NOT NULL,
    "metric_id" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" VARCHAR(10) NOT NULL,
    "value_ms" INTEGER NOT NULL,
    "rating" VARCHAR(20) NOT NULL,
    "navigation_type" VARCHAR(30) NOT NULL,
    "path" VARCHAR(100) NOT NULL,
    "from_scan" BOOLEAN NOT NULL DEFAULT false,
    "connection_type" VARCHAR(20),
    "effective_type" VARCHAR(10),
    "device" VARCHAR(20) NOT NULL,
    "role" VARCHAR(20) NOT NULL,

    CONSTRAINT "web_vital_samples_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "web_vital_samples_metric_id_unique" ON "web_vital_samples"("metric_id");

-- CreateIndex
CREATE INDEX "web_vital_samples_path_created_at_index" ON "web_vital_samples"("path", "created_at");

