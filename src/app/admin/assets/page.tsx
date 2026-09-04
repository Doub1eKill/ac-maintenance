import { getAssetsPageData } from "@/lib/admin/pages";
import { AssetsClient } from "./assets-client";

export const metadata = { title: "ระบบสินทรัพย์ | AC Maintenance System" };

export default async function AssetsPage() {
  const { buildings, brands } = await getAssetsPageData();
  return <AssetsClient buildings={buildings} brands={brands} />;
}
