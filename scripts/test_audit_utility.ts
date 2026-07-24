import { logAudit } from "../src/lib/audit";
async function main() {
  console.log("logAudit type is:", typeof logAudit);
  if (typeof logAudit !== 'function') throw new Error('logAudit is not a function');
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
