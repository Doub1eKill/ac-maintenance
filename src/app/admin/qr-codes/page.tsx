import { getQrCodesPageData } from "@/lib/admin/pages";
import { QrCodesClient } from "./qr-codes-client";

export const metadata = { title: "จัดการ QR Code | AC Maintenance System" };

export default async function QrCodesPage() {
  const { buildings } = await getQrCodesPageData();
  return <QrCodesClient buildings={buildings} />;
}
