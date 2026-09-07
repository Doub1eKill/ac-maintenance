-- CreateEnum
CREATE TYPE "users_role" AS ENUM ('org_admin', 'technician');

-- CreateEnum
CREATE TYPE "users_status" AS ENUM ('pending', 'active', 'suspended');

-- CreateEnum
CREATE TYPE "work_orders_type" AS ENUM ('repair', 'cleaning');

-- CreateEnum
CREATE TYPE "work_orders_status" AS ENUM ('pending', 'claimed', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "maintenance_logs_action" AS ENUM ('cleaning', 'repair', 'refill_refrigerant');

-- CreateEnum
CREATE TYPE "air_conditioners_status" AS ENUM ('normal', 'broken', 'needs_cleaning');

-- CreateTable
CREATE TABLE "buildings" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "abbreviation" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMP(0),
    "updated_at" TIMESTAMP(0),

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" BIGSERIAL NOT NULL,
    "building_id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "floor" SMALLINT,
    "created_at" TIMESTAMP(0),
    "updated_at" TIMESTAMP(0),

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "role" "users_role" NOT NULL DEFAULT 'technician',
    "status" "users_status" NOT NULL DEFAULT 'pending',
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "email_verified_at" TIMESTAMP(0),
    "password" VARCHAR(255),
    "avatar_url" VARCHAR(255),
    "remember_token" VARCHAR(100),
    "created_at" TIMESTAMP(0),
    "updated_at" TIMESTAMP(0),
    "deleted_at" TIMESTAMP(0),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_phones" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "phone_number" VARCHAR(255) NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(0),
    "updated_at" TIMESTAMP(0),

    CONSTRAINT "user_phones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ac_brands" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(0),
    "updated_at" TIMESTAMP(0),
    "deleted_at" TIMESTAMP(0),

    CONSTRAINT "ac_brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ac_models" (
    "id" BIGSERIAL NOT NULL,
    "brand_id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "default_btu" INTEGER,
    "created_at" TIMESTAMP(0),
    "updated_at" TIMESTAMP(0),
    "deleted_at" TIMESTAMP(0),

    CONSTRAINT "ac_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "air_conditioners" (
    "id" BIGSERIAL NOT NULL,
    "room_id" BIGINT NOT NULL,
    "ac_brand_id" BIGINT,
    "ac_model_id" BIGINT,
    "ac_code" VARCHAR(255) NOT NULL,
    "qr_code" CHAR(36) NOT NULL,
    "brand" VARCHAR(255),
    "model" VARCHAR(255),
    "btu" INTEGER,
    "installed_at" DATE,
    "status" "air_conditioners_status" NOT NULL DEFAULT 'normal',
    "created_at" TIMESTAMP(0),
    "updated_at" TIMESTAMP(0),
    "deleted_at" TIMESTAMP(0),

    CONSTRAINT "air_conditioners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_logs" (
    "id" BIGSERIAL NOT NULL,
    "air_conditioner_id" BIGINT NOT NULL,
    "work_order_id" BIGINT,
    "user_id" BIGINT NOT NULL,
    "action" "maintenance_logs_action" NOT NULL,
    "notes" TEXT,
    "repair_detail" TEXT,
    "before_photo_url" VARCHAR(255),
    "after_photo_url" VARCHAR(255),
    "customer_signature_url" VARCHAR(255),
    "performed_at" TIMESTAMP(0) NOT NULL,
    "created_at" TIMESTAMP(0),
    "updated_at" TIMESTAMP(0),

    CONSTRAINT "maintenance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_orders" (
    "id" BIGSERIAL NOT NULL,
    "air_conditioner_id" BIGINT NOT NULL,
    "status" "work_orders_status" NOT NULL DEFAULT 'pending',
    "type" "work_orders_type" NOT NULL,
    "priority" VARCHAR(20) DEFAULT 'low',
    "issue_description" TEXT,
    "resolution_notes" TEXT,
    "images" JSONB DEFAULT '[]',
    "reported_by_id" BIGINT,
    "assigned_to_id" BIGINT,
    "assigned_at" TIMESTAMP(0),
    "claimed_by" BIGINT,
    "claimed_at" TIMESTAMP(0),
    "completed_at" TIMESTAMP(0),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0),

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" BIGINT NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_schedules" (
    "id" BIGSERIAL NOT NULL,
    "air_conditioner_id" BIGINT NOT NULL,
    "frequency_months" SMALLINT,
    "frequency_value" INTEGER NOT NULL DEFAULT 6,
    "frequency_unit" VARCHAR(20) NOT NULL DEFAULT 'months',
    "last_performed_at" DATE,
    "next_due_date" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "maintenance_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "default_frequency_value" INTEGER NOT NULL DEFAULT 6,
    "default_frequency_unit" VARCHAR(20) NOT NULL DEFAULT 'months',
    "organisation_name" VARCHAR(255),
    "organisation_address" VARCHAR(255),
    "organisation_phone" VARCHAR(255),
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "buildings_name_unique" ON "buildings"("name");

-- CreateIndex
CREATE UNIQUE INDEX "buildings_abbreviation_unique" ON "buildings"("abbreviation");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_building_id_name_unique" ON "rooms"("building_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_unique" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_status_index" ON "users"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "user_phones_user_id_phone_number_unique" ON "user_phones"("user_id", "phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "ac_brands_name_unique" ON "ac_brands"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ac_models_brand_id_name_unique" ON "ac_models"("brand_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "air_conditioners_ac_code_unique" ON "air_conditioners"("ac_code");

-- CreateIndex
CREATE UNIQUE INDEX "air_conditioners_qr_code_unique" ON "air_conditioners"("qr_code");

-- CreateIndex
CREATE INDEX "air_conditioners_room_id_index" ON "air_conditioners"("room_id");

-- CreateIndex
CREATE INDEX "maintenance_logs_air_conditioner_id_performed_at_index" ON "maintenance_logs"("air_conditioner_id", "performed_at");

-- CreateIndex
CREATE INDEX "maintenance_logs_user_id_index" ON "maintenance_logs"("user_id");

-- CreateIndex
CREATE INDEX "maintenance_logs_work_order_id_index" ON "maintenance_logs"("work_order_id");

-- CreateIndex
CREATE INDEX "work_orders_status_created_at_index" ON "work_orders"("status", "created_at");

-- CreateIndex
CREATE INDEX "work_orders_air_conditioner_id_status_index" ON "work_orders"("air_conditioner_id", "status");

-- CreateIndex
CREATE INDEX "work_orders_claimed_by_index" ON "work_orders"("claimed_by");

-- CreateIndex
CREATE INDEX "audit_entity_idx" ON "system_audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "schedule_due_date_idx" ON "maintenance_schedules"("next_due_date");

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_building_id_foreign" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "user_phones" ADD CONSTRAINT "user_phones_user_id_foreign" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ac_models" ADD CONSTRAINT "ac_models_brand_id_foreign" FOREIGN KEY ("brand_id") REFERENCES "ac_brands"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "air_conditioners" ADD CONSTRAINT "air_conditioners_room_id_foreign" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "air_conditioners" ADD CONSTRAINT "airConditioners_ac_brand_id_foreign" FOREIGN KEY ("ac_brand_id") REFERENCES "ac_brands"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "air_conditioners" ADD CONSTRAINT "airConditioners_ac_model_id_foreign" FOREIGN KEY ("ac_model_id") REFERENCES "ac_models"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_air_conditioner_id_foreign" FOREIGN KEY ("air_conditioner_id") REFERENCES "air_conditioners"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_user_id_foreign" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_work_order_id_foreign" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_air_conditioner_id_foreign" FOREIGN KEY ("air_conditioner_id") REFERENCES "air_conditioners"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_reported_by_foreign" FOREIGN KEY ("reported_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_assigned_to_foreign" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_claimed_by_foreign" FOREIGN KEY ("claimed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "system_audit_logs" ADD CONSTRAINT "audit_user_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "schedule_ac_fk" FOREIGN KEY ("air_conditioner_id") REFERENCES "air_conditioners"("id") ON DELETE CASCADE ON UPDATE RESTRICT;
