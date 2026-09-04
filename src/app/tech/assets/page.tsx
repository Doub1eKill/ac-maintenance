import { getTechAssetsPageData } from "@/lib/tech/pages";
import { TechAssetsClient } from "./assets-client";

export const metadata = { title: "แอร์ทั้งหมด | AC Maintenance System" };

export default async function TechAssetsPage() {
  const { assetList, assetSummary } = await getTechAssetsPageData();
  return <TechAssetsClient assetList={assetList} assetSummary={assetSummary} />;
}
