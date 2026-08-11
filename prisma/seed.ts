import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

async function main() {
  console.log("🌱 Starting comprehensive seed for AC Maintenance platform...");

  console.log("🧹 Cleaning up old data...");
  await prisma.systemAuditLog.deleteMany();
  await prisma.maintenanceLog.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.maintenanceSchedule.deleteMany();
  await prisma.airConditioner.deleteMany();
  await prisma.room.deleteMany();
  await prisma.building.deleteMany();
  await prisma.acModel.deleteMany();
  await prisma.acBrand.deleteMany();
  
  await prisma.userPhone.deleteMany();
  await prisma.user.deleteMany({
    where: {
      email: {
        notIn: ["admin@pkru.ac.th", "tech@pkru.ac.th"]
      }
    }
  });

  console.log("👥 Seeding Users...");
  const defaultPasswordHash = await bcrypt.hash("Password123!", 10);

  const orgAdmin = await prisma.user.upsert({
    where: { email: "admin@pkru.ac.th" },
    update: { password: defaultPasswordHash, status: "active", role: "org_admin" },
    create: {
      name: "ผู้ดูแลระบบ มรภ.ภูเก็ต (Org Admin)",
      email: "admin@pkru.ac.th",
      password: defaultPasswordHash,
      role: "org_admin",
      status: "active",
    },
  });

  const techUser = await prisma.user.upsert({
    where: { email: "tech@pkru.ac.th" },
    update: { password: defaultPasswordHash, status: "active", role: "technician" },
    create: {
      name: "สมชาย ช่างซ่อม (Technician)",
      email: "tech@pkru.ac.th",
      password: defaultPasswordHash,
      role: "technician",
      status: "active",
    },
  });

  console.log("🏷️ Seeding Brands and Models...");
  const daikin = await prisma.acBrand.create({ data: { name: "Daikin" } });
  const mitsu = await prisma.acBrand.create({ data: { name: "Mitsubishi" } });
  const panasonic = await prisma.acBrand.create({ data: { name: "Panasonic" } });

  const daikinModel1 = await prisma.acModel.create({ data: { brandId: daikin.id, name: "Inverter 12000", defaultBtu: 12000 } });
  const daikinModel2 = await prisma.acModel.create({ data: { brandId: daikin.id, name: "Inverter 18000", defaultBtu: 18000 } });
  
  const mitsuModel1 = await prisma.acModel.create({ data: { brandId: mitsu.id, name: "Heavy Duty 18000", defaultBtu: 18000 } });
  const mitsuModel2 = await prisma.acModel.create({ data: { brandId: mitsu.id, name: "Heavy Duty 24000", defaultBtu: 24000 } });

  const panaModel = await prisma.acModel.create({ data: { brandId: panasonic.id, name: "Econavi 18000", defaultBtu: 18000 } });

  console.log("🏢 Seeding Buildings and Rooms...");
  const bldgSci = await prisma.building.create({
    data: { name: "อาคารวิทยาศาสตร์", abbreviation: "SCI" }
  });
  const bldgEdu = await prisma.building.create({
    data: { name: "อาคารครุศาสตร์", abbreviation: "EDU" }
  });

  const roomSci101 = await prisma.room.create({ data: { buildingId: bldgSci.id, name: "101", floor: 1 } });
  const roomSci102 = await prisma.room.create({ data: { buildingId: bldgSci.id, name: "102", floor: 1 } });
  const roomEdu201 = await prisma.room.create({ data: { buildingId: bldgEdu.id, name: "201", floor: 2 } });
  const roomEdu202 = await prisma.room.create({ data: { buildingId: bldgEdu.id, name: "202", floor: 2 } });

  console.log("❄️ Seeding Air Conditioners...");
  const acs = [];

  // SCI 101 - 2 ACs
  acs.push(await prisma.airConditioner.create({
    data: {
      roomId: roomSci101.id,
      acBrandId: daikin.id,
      acModelId: daikinModel2.id,
      acCode: "SCI-101-01",
      qrCode: crypto.randomUUID(),
      btu: 18000,
      status: "normal",
      installedAt: new Date("2023-01-15"),
    }
  }));
  acs.push(await prisma.airConditioner.create({
    data: {
      roomId: roomSci101.id,
      acBrandId: daikin.id,
      acModelId: daikinModel2.id,
      acCode: "SCI-101-02",
      qrCode: crypto.randomUUID(),
      btu: 18000,
      status: "needs_cleaning",
      installedAt: new Date("2023-01-15"),
    }
  }));

  // SCI 102 - 1 AC
  acs.push(await prisma.airConditioner.create({
    data: {
      roomId: roomSci102.id,
      acBrandId: panasonic.id,
      acModelId: panaModel.id,
      acCode: "SCI-102-01",
      qrCode: crypto.randomUUID(),
      btu: 18000,
      status: "normal",
      installedAt: new Date("2023-05-10"),
    }
  }));

  // EDU 201 - 4 ACs
  for (let i = 1; i <= 4; i++) {
    acs.push(await prisma.airConditioner.create({
      data: {
        roomId: roomEdu201.id,
        acBrandId: mitsu.id,
        acModelId: mitsuModel2.id,
        acCode: `EDU-201-0${i}`,
        qrCode: crypto.randomUUID(),
        btu: 24000,
        status: i === 4 ? "broken" : "normal",
        installedAt: new Date("2022-08-20"),
      }
    }));
  }

  // EDU 202 - 2 ACs
  acs.push(await prisma.airConditioner.create({
    data: {
      roomId: roomEdu202.id,
      acBrandId: daikin.id,
      acModelId: daikinModel1.id,
      acCode: "EDU-202-01",
      qrCode: crypto.randomUUID(),
      btu: 12000,
      status: "normal",
      installedAt: new Date("2024-02-01"),
    }
  }));
  acs.push(await prisma.airConditioner.create({
    data: {
      roomId: roomEdu202.id,
      acBrandId: daikin.id,
      acModelId: daikinModel1.id,
      acCode: "EDU-202-02",
      qrCode: crypto.randomUUID(),
      btu: 12000,
      status: "normal",
      installedAt: new Date("2024-02-01"),
    }
  }));

  console.log("📅 Seeding Maintenance Schedules...");
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  await prisma.maintenanceSchedule.create({
    data: {
      airConditionerId: acs[0].id,
      frequencyValue: 6,
      frequencyUnit: "months",
      nextDueDate: nextMonth,
    }
  });

  console.log("📋 Seeding Work Orders...");

  // Pending Work Order
  await prisma.workOrder.create({
    data: {
      airConditionerId: acs[1].id, // needs_cleaning
      status: "pending",
      priority: "high",
      issueDescription: "แอร์มีน้ำหยดลงมาที่โต๊ะนักศึกษา รบกวนช่างเข้ามาดูด่วนครับ",
      reportedById: orgAdmin.id,
      images: JSON.stringify(["https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=500&q=80"]), // Example AC water leak mockup
    }
  });

  // Claimed Work Order
  await prisma.workOrder.create({
    data: {
      airConditionerId: acs[6].id, // broken
      status: "claimed",
      priority: "critical",
      issueDescription: "แอร์เปิดไม่ติดเลย ไฟกระพริบที่ปุ่ม Timer ตลอดเวลา",
      reportedById: orgAdmin.id,
      assignedToId: techUser.id,
      assignedAt: new Date(Date.now() - 2 * 3600000), // 2 hours ago
      claimedBy: techUser.id,
      claimedAt: new Date(),
    }
  });

  // Completed Work Order
  const completedWo = await prisma.workOrder.create({
    data: {
      airConditionerId: acs[4].id,
      status: "completed",
      priority: "low",
      issueDescription: "แจ้งล้างแอร์ประจำรอบ (ห้องประชุม EDU-201 ตัวที่ 2)",
      reportedById: orgAdmin.id,
      assignedToId: techUser.id,
      assignedAt: new Date(Date.now() - 5 * 86400000),
      claimedBy: techUser.id,
      claimedAt: new Date(Date.now() - 4 * 86400000),
      completedAt: new Date(Date.now() - 3 * 86400000),
      resolutionNotes: "ล้างใหญ่ เติมน้ำยาแอร์เพิ่ม ทำงานได้ปกติแล้ว ความเย็นลดลงเหลือ 24 องศา",
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1599839619722-39751411ea63?w=500&q=80", // Before
        "https://images.unsplash.com/photo-1581092926391-764f69324705?w=500&q=80"  // After
      ]),
    }
  });

  await prisma.maintenanceLog.create({
    data: {
      airConditionerId: acs[4].id,
      workOrderId: completedWo.id,
      userId: techUser.id,
      action: "cleaning",
      notes: "ล้างใหญ่ เติมน้ำยาแอร์เพิ่ม ทำงานได้ปกติแล้ว ความเย็นลดลงเหลือ 24 องศา",
      performedAt: new Date(Date.now() - 3 * 86400000),
    }
  });

  await prisma.maintenanceLog.create({
    data: {
      airConditionerId: acs[4].id,
      userId: techUser.id,
      action: "repair",
      notes: "เปลี่ยนคาปาซิเตอร์พัดลมคอยล์ร้อน",
      performedAt: new Date(Date.now() - 150 * 86400000),
    }
  });

  console.log("✅ Comprehensive seed completed successfully!");
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
