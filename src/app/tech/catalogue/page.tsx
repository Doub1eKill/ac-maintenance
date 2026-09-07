import { getTechCataloguePageData } from "@/lib/tech/pages";
import { TechCatalogueClient } from "./catalogue-client";

export const metadata = { title: "ยี่ห้อ/รุ่นแอร์ | AC Maintenance System" };

export default async function TechCataloguePage() {
  const { brands } = await getTechCataloguePageData();
  return <TechCatalogueClient brands={brands} />;
}
