import { GET as TechGET } from "../src/app/api/tech/work-orders/route";
import { PATCH as TechClaimPATCH } from "../src/app/api/tech/work-orders/[id]/claim/route";
import { POST as TechCompletePOST } from "../src/app/api/tech/work-orders/[id]/complete/route";

import { GET as AdminGET, POST as AdminPOST } from "../src/app/api/admin/work-orders/route";

async function main() {
  console.log("TechGET type:", typeof TechGET);
  console.log("TechClaimPATCH type:", typeof TechClaimPATCH);
  console.log("TechCompletePOST type:", typeof TechCompletePOST);
  
  console.log("AdminGET type:", typeof AdminGET);
  console.log("AdminPOST type:", typeof AdminPOST);

  if (typeof TechGET !== 'function') throw new Error('TechGET is not a function');
  if (typeof TechClaimPATCH !== 'function') throw new Error('TechClaimPATCH is not a function');
  if (typeof TechCompletePOST !== 'function') throw new Error('TechCompletePOST is not a function');
  if (typeof AdminGET !== 'function') throw new Error('AdminGET is not a function');
  if (typeof AdminPOST !== 'function') throw new Error('AdminPOST is not a function');

  console.log("Workflow API handlers exported correctly.");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
