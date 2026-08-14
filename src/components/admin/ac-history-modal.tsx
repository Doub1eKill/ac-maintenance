"use client";

import { useEffect, useState } from "react";
import { X, Clock, MapPin, Wrench, Loader2 } from "lucide-react";
import { getAirConditionerHistory } from "@/app/admin/actions";

interface AcHistoryModalProps {
  airConditionerId: string;
  onClose: () => void;
}

interface HistoryUnit {
  acCode: string;
  brand: string;
  model: string | null;
  btu: number | null;
  status: string;
  location: string;
  installedAt: string | null;
}

interface HistoryEntry {
  id: string;
  action: "cleaning" | "repair" | "refill_refrigerant";
  performedAt: string;
  technicianName: string;
  notes: string | null;
  repairDetail: string | null;
  beforePhotoUrl: string | null;
  afterPhotoUrl: string | null;
}

const ACTION_LABEL: Record<HistoryEntry["action"], string> = {
  cleaning: "ล้างแอร์",
  repair: "ซ่อมแซม",
  refill_refrigerant: "เติมน้ำยาแอร์",
};

export function AcHistoryModal({ airConditionerId, onClose }: AcHistoryModalProps) {
  const [unit, setUnit] = useState<HistoryUnit | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getAirConditionerHistory(airConditionerId).then((result) => {
      if (cancelled) return;
      if ("error" in result) {
        setError(result.error ?? "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      } else {
        setUnit(result.unit);
        setHistory(result.history);
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [airConditionerId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-white p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            ประวัติการซ่อมบำรุง{unit ? ` — ${unit.acCode}` : ""}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดข้อมูล...
          </div>
        )}

        {error && (
          <div className="text-center py-6 text-sm text-destructive">{error}</div>
        )}

        {unit && (
          <div className="rounded-xl border border-border bg-muted p-3.5 text-xs space-y-1.5">
            <div className="font-bold text-foreground text-sm">
              {unit.brand} {unit.model ? `• ${unit.model}` : ""} {unit.btu ? `(${unit.btu.toLocaleString()} BTU)` : ""}
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {unit.location}
            </div>
            {unit.installedAt && (
              <div className="text-muted-foreground">
                ติดตั้งเมื่อ {new Date(unit.installedAt).toLocaleDateString("th-TH")}
              </div>
            )}
          </div>
        )}

        {!isLoading && !error && (
          history.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              ยังไม่มีประวัติการซ่อมบำรุง
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((log) => (
                <div key={log.id} className="relative pl-6 border-l-2 border-border last:border-transparent pb-4 last:pb-0">
                  <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-primary" />
                  <div className="text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                    {ACTION_LABEL[log.action]}
                  </div>
                  <div className="text-[11px] text-muted-foreground mb-2">
                    {new Date(log.performedAt).toLocaleString("th-TH")} • โดย {log.technicianName}
                  </div>
                  {log.repairDetail && (
                    <div className="text-xs text-foreground bg-muted p-2.5 rounded-lg border border-border mb-1.5">
                      <span className="font-bold">ซ่อมอะไรไปบ้าง: </span>{log.repairDetail}
                    </div>
                  )}
                  {log.notes && (
                    <div className="text-xs text-muted-foreground bg-muted p-2.5 rounded-lg border border-border mb-1.5">
                      {log.notes}
                    </div>
                  )}
                  {(log.beforePhotoUrl || log.afterPhotoUrl) && (
                    <div className="flex gap-2 mt-1.5">
                      {log.beforePhotoUrl && (
                        <a href={log.beforePhotoUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-primary hover:underline">
                          รูปก่อนซ่อม
                        </a>
                      )}
                      {log.afterPhotoUrl && (
                        <a href={log.afterPhotoUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-primary hover:underline">
                          รูปหลังซ่อม
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
