import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  console.log("🌱 Seeding test accounts for AC Maintenance platform...");

  // 1. Ensure at least one University exists (Phuket Rajabhat University - PKRU)
  const pkru = await prisma.university.upsert({
    where: { abbreviation: "PKRU" },
    update: {},
    create: {
      name: "มหาวิทยาลัยราชภัฏภูเก็ต (Phuket Rajabhat University)",
      abbreviation: "PKRU",
      address: "21 หมู่ 6 ถ.เทพกระษัตรี ต.รัษฎา อ.เมือง จ.ภูเก็ต 83000",
      phone: "076-211-959",
    },
  });

  const defaultPasswordHash = await bcrypt.hash("Password123!", 10);

  // 2. Super Admin Account (Platform level, universityId = null)
  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@ac-maintenance.com" },
    update: {
      password: defaultPasswordHash,
      status: "active",
      role: "super_admin",
    },
    create: {
      name: "Super Admin (ผู้ดูแลระบบส่วนกลาง)",
      email: "superadmin@ac-maintenance.com",
      password: defaultPasswordHash,
      role: "super_admin",
      status: "active",
      universityId: null,
    },
  });

  // 3. Org Admin Account (University Admin - PKRU)
  const orgAdmin = await prisma.user.upsert({
    where: { email: "admin@pkru.ac.th" },
    update: {
      password: defaultPasswordHash,
      status: "active",
      role: "org_admin",
      universityId: pkru.id,
    },
    create: {
      name: "ผู้ดูแลระบบ มรภ.ภูเก็ต (Org Admin)",
      email: "admin@pkru.ac.th",
      password: defaultPasswordHash,
      role: "org_admin",
      status: "active",
      universityId: pkru.id,
    },
  });

  // 4. Technician Account (Field Tech - PKRU)
  const techUser = await prisma.user.upsert({
    where: { email: "tech@pkru.ac.th" },
    update: {
      password: defaultPasswordHash,
      status: "active",
      role: "technician",
      universityId: pkru.id,
    },
    create: {
      name: "สมชาย ช่างซ่อม (Technician)",
      email: "tech@pkru.ac.th",
      password: defaultPasswordHash,
      role: "technician",
      status: "active",
      universityId: pkru.id,
    },
  });

  console.log("✅ Seed completed successfully!");
  console.log("-------------------------------------------------------");
  console.log("🔐 Credentials created (Password for all: Password123!):");
  console.log(`1. Super Admin  : ${superAdmin.email}`);
  console.log(`2. Org Admin    : ${orgAdmin.email}`);
  console.log(`3. Technician   : ${techUser.email}`);
  console.log("-------------------------------------------------------");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
                                          });
