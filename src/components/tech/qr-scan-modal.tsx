"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { QrCode, X } from "lucide-react";
import { scanQrCodeAction } from "@/app/tech/actions";

interface QrScanModalProps {
  open: boolean;
  isPending: boolean;
  onClose: () => void;
  onClaim: (workOrderId: string) => void;
  onPlaceholderCreated: () => void;
  onScanError: (message: string) => void;
}

export function QrScanModal({ open, isPending, onClose, onClaim, onPlaceholderCreated, onScanError }: QrScanModalProps) {
  const [scannedAcCode, setScannedAcCode] = useState("");
  const [qrResult, setQrResult] = useState<any>(null);

  useEffect(() => {
    if (!open) {
      setScannedAcCode("");
      setQrResult(null);
    }
  }, [open]);

  async function handleSimulateQrScan() {
    if (!scannedAcCode.trim()) return;
    setQrResult(null);

    const res = await scanQrCodeAction(scannedAcCode.trim());
    if (res.error) {
      onScanError(res.error);
    } else {
      setQrResult(res);
    }
  }

  function handleClaimFromQr() {
    if (qrResult?.pendingJobId) {
      onClaim(qrResult.pendingJobId);
      onClose();
      setQrResult(null);
      setScannedAcCode("");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/40 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-border bg-white p-6 pb-10 sm:pb-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:fade-in">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <QrCode className="h-4 w-4 text-foreground" />
            <span>สแกนรหัส QR เครื่องปรับอากาศ</span>
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!qrResult ? (
          <>
            <div className="relative h-40 w-full rounded-xl border-2 border-dashed border-border bg-muted flex flex-col items-center justify-center overflow-hidden">
              <div className="absolute inset-x-0 h-0.5 bg-primary animate-laser" />
              <QrCode className="h-12 w-12 text-muted-foreground animate-pulse" />
              <span className="text-[11px] font-semibold text-muted-foreground mt-2">เล็งกล้องไปที่ QR Code</span>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-foreground">จำลองการสแกน:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={scannedAcCode}
                  onChange={(e) => setScannedAcCode(e.target.value)}
                  placeholder="e.g. PKRU-ENG-101-AC1"
                  className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-xs text-foreground font-mono focus:border-primary focus:outline-none"
                />
                <button
                  onClick={handleSimulateQrScan}
                  disabled={isPending}
                  className="rounded-xl bg-foreground px-4 py-2 text-xs font-bold text-white hover:bg-primary/90 shrink-0"
                >
                  ยืนยัน
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4 animate-in zoom-in-95">
            <div className="bg-muted border border-border p-4 rounded-xl space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-mono text-lg font-bold text-foreground">{qrResult.acDetails.acCode}</div>
                  <div className="text-xs text-muted-foreground font-medium">{qrResult.acDetails.location}</div>
                </div>
                <span className="bg-accent text-foreground text-[10px] font-bold px-2 py-1 rounded-md">
                  {qrResult.acDetails.brand}
                </span>
              </div>

              <div className="border-t border-border pt-3 flex flex-col gap-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">สถานะล่าสุด:</span>
                  <span className="font-bold">{qrResult.acDetails.status === 'normal' ? '✅ ปกติ' : '⚠️ มีปัญหา'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ซ่อมบำรุงล่าสุด:</span>
                  <span className="font-semibold">{qrResult.acDetails.lastMaintenance ? format(new Date(qrResult.acDetails.lastMaintenance), "dd/MM/yyyy") : 'ไม่เคยซ่อมบำรุง'}</span>
                </div>
              </div>
            </div>

            {qrResult.pendingJobId ? (
              <div className="bg-warning/10 border border-warning/30 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-warning-foreground">มีใบงานค้างอยู่!</div>
                  <div className="text-[10px] text-warning-foreground">ต้องการรับงานนี้หรือไม่?</div>
                </div>
                <button
                  onClick={handleClaimFromQr}
                  disabled={isPending}
                  className="bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-amber-700 shadow-sm"
                >
                  รับงานทันที
                </button>
              </div>
            ) : (
              <div className="bg-success/10 border border-success/30 p-3 rounded-xl">
                <div className="text-xs font-bold text-success-foreground mb-2">ไม่พบใบงานแจ้งซ่อมค้างอยู่</div>
                <button
                  onClick={onPlaceholderCreated}
                  className="w-full bg-success text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-success/90 shadow-sm"
                >
                  สร้างใบงาน PM ใหม่
                </button>
              </div>
            )}

            <button
              onClick={() => setQrResult(null)}
              className="w-full border border-border bg-white text-foreground text-xs font-bold px-3 py-2 rounded-lg hover:bg-muted"
            >
              สแกนเครื่องใหม่
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
