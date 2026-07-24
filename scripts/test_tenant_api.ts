import { POST } from "../src/app/api/super-admin/universities/route";
import { PATCH } from "../src/app/api/super-admin/universities/[id]/status/route";

async function main() {
  console.log("POST type is:", typeof POST);
  if (typeof POST !== 'function') throw new Error('POST is not a function');
  
  console.log("PATCH type is:", typeof PATCH);
  if (typeof PATCH !== 'function') throw new Error('PATCH is not a function');
  
  console.log("API handlers exported correctly.");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
