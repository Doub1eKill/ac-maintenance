import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

/**
 * Common data structure required to render and print a standard AC QR sticker.
 */
export interface QrStickerUnit {
  id: string;
  acCode: string;
  brand: string;
  model: string | null;
  btu: number | null;
  qrCode: string;
  roomSequence?: number | null;
  roomName?: string | null;
  buildingName?: string | null;
}

/**
 * The printed sheet: one column of five 150 x 52 mm stickers on A4.
 */
export const STICKERS_PER_SHEET = 5;

export const STICKER_SHEET_CSS = `
  @page { size: A4; margin: 8mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Sarabun", "Leelawadee UI", Tahoma, sans-serif;
    color: #111;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet { display: grid; grid-template-columns: 1fr; gap: 4mm; }
  .sticker {
    width: 150mm;
    margin: 0 auto;
    height: 52mm;
    border: 0.4mm solid #111;
    padding: 3mm;
    display: flex;
    align-items: center;
    gap: 5mm;
    background: #fff;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .sticker-qr { flex: 0 0 46mm; }
  .sticker-qr svg { display: block; width: 46mm; height: 46mm; }
  .sticker-body { flex: 1 1 auto; min-width: 0; overflow: hidden; }
  .sticker-seq { display: flex; align-items: center; gap: 3mm; }
  .sticker-seq-num {
    flex: 0 0 auto;
    width: 11mm; height: 11mm;
    border-radius: 50%;
    background: #111; color: #fff;
    font-size: 6.5mm; font-weight: 700; line-height: 11mm;
    text-align: center;
  }
  .sticker-seq-label { font-size: 4.2mm; color: #444; }
  .sticker-brand {
    font-size: 7mm; font-weight: 700; margin-top: 2mm; line-height: 1.2;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .sticker-spec {
    font-size: 5mm; margin-top: 1mm; line-height: 1.3;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .sticker-code {
    font-family: "Consolas", monospace;
    font-size: 6mm; font-weight: 700; letter-spacing: 0.3mm;
    margin-top: 2mm;
  }
  .sticker-cta { font-size: 3.6mm; color: #555; margin-top: 1.5mm; }
`;

/** The scanned target URL for a unit's QR code. */
export function qrTargetUrl(qrCode: string) {
  return `${typeof window !== "undefined" ? window.location.origin : ""}/qr/${qrCode}`;
}

/** Extracts the sequence number within the room from the unit code (e.g. EDU-201-02 -> 2) */
export function roomSequenceOf(acCode: string): number | null {
  const last = acCode.split("-").pop();
  if (!last || !/^\d+$/.test(last)) return null;
  return Number(last);
}

/**
 * Standard sticker component, rendered hidden and extracted as innerHTML for printing.
 */
export function StickerCard({ ac }: { ac: QrStickerUnit }) {
  const seq = ac.roomSequence ?? roomSequenceOf(ac.acCode);
  return (
    <div className="sticker">
      <div className="sticker-qr">
        <QRCodeSVG value={qrTargetUrl(ac.qrCode)} size={220} level="H" includeMargin={true} />
      </div>
      <div className="sticker-body">
        <div className="sticker-seq">
          <span className="sticker-seq-num">{seq ?? "?"}</span>
          <span className="sticker-seq-label">
            เครื่องที่ {seq ?? "-"} {ac.roomName ? `· ห้อง ${ac.roomName}` : ""}
          </span>
        </div>
        <div className="sticker-brand">{ac.brand}</div>
        <div className="sticker-spec">
          {ac.model ?? "ไม่ระบุรุ่น"} · {ac.btu ? `${ac.btu.toLocaleString()} BTU` : "ไม่ระบุ BTU"}
        </div>
        <div className="sticker-code">{ac.acCode}</div>
        <div className="sticker-cta">สแกนเพื่อแจ้งซ่อม / ดูประวัติ</div>
      </div>
    </div>
  );
}

/**
 * Opens a print window with standard sticker sheet formatting and pop-up guard.
 */
export function openStickerSheet(stickersHtml: string, title: string) {
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    toast.error("เบราว์เซอร์บล็อกหน้าต่างพิมพ์", {
      description: "กรุณาอนุญาต pop-up ของเว็บนี้ในแถบที่อยู่ แล้วกดพิมพ์อีกครั้ง",
    });
    return;
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>${STICKER_SHEET_CSS}</style>
      </head>
      <body>
        <div class="sheet">${stickersHtml}</div>
        <script>
          window.onload = () => { window.print(); window.close(); }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
