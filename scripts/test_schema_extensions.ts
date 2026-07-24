import { prisma } from "../src/lib/prisma";
async function main() {
  const user = await prisma.user.findFirst();
  if (user && !('deletedAt' in user)) throw new Error("deletedAt missing from User");
  const ac = await prisma.airConditioner.findFirst();
  if (ac && !('deletedAt' in ac)) throw new Error("deletedAt missing from AirConditioner");
  console.log("Schema extensions verified.");
}
main().catch(console.error).finally(() => prisma.$disconnect());
