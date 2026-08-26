"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { X, Clock, MapPin, Wrench, Loader2, Pencil } from "lucide-react";
import { getAirConditionerHistory, updateMaintenanceLogAction } from "@/app/admin/actions";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

interface AcHistoryModalProps {
  airConditionerId: string;
  onClose: () => void;
  // Org admins can edit every entry; everyone else (technicians) only the
  // ones they recorded themselves — updateMaintenanceLogAction enforces this
  // server-side regardless, but showing "แก้ไข" on a log a technician can't
  // actually save would just be a button that always errors.
  currentUserId?: string;
  isAdmin?: boolean;
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
  technicianId: string;
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

export function AcHistoryModal({ airConditionerId, onClose, currentUserId, isAdmin = false }: AcHistoryModalProps) {
  const [unit, setUnit] = useState<HistoryUnit | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editAction, setEditAction] = useState<HistoryEntry["action"]>("cleaning");
  const [editNotes, setEditNotes] = useState("");
  const [editRepairDetail, setEditRepairDetail] = useState("");
  const [isSaving, startSaveTransition] = useTransition();

  function handleStartEdit(log: HistoryEntry) {
    setEditingLogId(log.id);
    setEditAction(log.action);
    setEditNotes(log.notes ?? "");
    setEditRepairDetail(log.repairDetail ?? "");
  }

  function handleSaveEdit(logId: string) {
    if (editAction === "repair" && !editRepairDetail.trim()) {
      toast.error("กรุณาระบุรายละเอียดการซ่อม");
      return;
    }
    startSaveTransition(async () => {
      const res = await updateMaintenanceLogAction(logId, editAction, editNotes, editRepairDetail);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setHistory((prev) =>
        prev.map((log) =>
          log.id === logId
            ? {
                ...log,
                action: editAction,
                notes: editNotes.trim() || null,
                repairDetail: editAction === "repair" ? editRepairDetail.trim() || null : null,
              }
            : log
        )
      );
      setEditingLogId(null);
      toast.success("แก้ไขประวัติสำเร็จ");
    });
  }

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
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in max-h-[90vh] overflow-y-auto">
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

                  {editingLogId === log.id ? (
                    <div className="space-y-2 bg-muted p-3 rounded-lg border border-border">
                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-foreground">ประเภทงาน</label>
                        <NativeSelect
                          value={editAction}
                          onChange={(e) => setEditAction(e.target.value as HistoryEntry["action"])}
                          className="w-full h-auto py-2 px-3 rounded-lg border-border text-xs text-foreground"
                        >
                          <NativeSelectOption value="cleaning">ล้างแอร์</NativeSelectOption>
                          <NativeSelectOption value="repair">ซ่อมแซม</NativeSelectOption>
                          <NativeSelectOption value="refill_refrigerant">เติมน้ำยาแอร์</NativeSelectOption>
                        </NativeSelect>
                      </div>
                      {editAction === "repair" && (
                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-foreground">
                            ซ่อมอะไรไปบ้าง <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={editRepairDetail}
                            onChange={(e) => setEditRepairDetail(e.target.value)}
                            rows={2}
                            className="w-full rounded-lg border border-border bg-card px-2.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                          />
                        </div>
                      )}
                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-foreground">หมายเหตุ</label>
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          rows={2}
                          className="w-full rounded-lg border border-border bg-card px-2.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingLogId(null)}
                          disabled={isSaving}
                          className="flex-1 rounded-lg border border-border bg-card py-1.5 text-[11px] font-bold text-foreground hover:bg-secondary disabled:opacity-50"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(log.id)}
                          disabled={isSaving}
                          className="flex-1 rounded-lg bg-primary py-1.5 text-[11px] font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                          {isSaving ? "กำลังบันทึก..." : "บันทึก"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                          {ACTION_LABEL[log.action]}
                        </div>
                        {(isAdmin || log.technicianId === currentUserId) && (
                          <button
                            type="button"
                            onClick={() => handleStartEdit(log)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground shrink-0"
                          >
                            <Pencil className="h-3 w-3" /> แก้ไข
                          </button>
                        )}
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
                    </>
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
