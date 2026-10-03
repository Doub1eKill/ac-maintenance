"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Building2,
  ChevronDown,
  Droplets,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import {
  BuildingGroupList,
  FloorGroupList,
  RoomGroupList,
  groupByBuilding,
  groupByFloor,
  groupByRoom,
} from "@/components/shared/building-groups";
import { EvidencePhotos } from "@/components/shared/evidence-photos";
import { UnitThumb } from "@/components/shared/unit-thumb";
import { WorkOrderPriorityBadge, WorkOrderTypeBadge } from "@/components/shared/work-order-badges";
import { ConfirmActionDialog } from "@/components/ui/thai-alert-dialogs";
import { useEscapeToClose } from "@/hooks/use-escape-to-close";
import { adminResetUserPasswordAction, getTechnicianDetail } from "@/app/admin/actions";
import type { TechnicianLogRow } from "@/lib/admin/users";
import type { PendingUser } from "@/components/admin/types";
import { MAINTENANCE_ACTION_LABEL } from "@/lib/labels";
import { UserStatusBadge } from "@/components/admin/user-card";
import { DeleteUserDialog, SuspendUserDialog } from "@/components/admin/user-account-dialogs";
import type { MaintenanceAction } from "@/generated/prisma/enums";

interface TechnicianDetail {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatarUrl: string | null;
  createdAt: string | null;
  phones: { number: string; isPrimary: boolean }[];
}

interface TechnicianDetailModalProps {
  user: PendingUser;
  currentUserId?: string | null;
  isPending: boolean;
  onUserStatus: (userId: string, status: "active" | "suspended") => void;
  onDeleteUser: (userId: string) => void;
  onClose: () => void;
}

// The wording comes from @/lib/labels so this list cannot drift from the
// history modal and the sticker page; only the icons are this modal's own.
const ACTION_ICONS: Record<MaintenanceAction, typeof Wrench> = {
  cleaning: Sparkles,
  repair: Wrench,
  refill_refrigerant: Droplets,
};

/**
 * One person's card, opened in place rather than on a page of its own.
 *
 * The right-hand side is their work history as a building > floor > room > unit
 * tree, built from the same grouping components every other list in this app
 * uses. Only what they actually worked on appears, and that falls out of the
 * grouping rather than needing a filter: groupByBuilding never creates an entry
 * for a building with no matching rows, so feeding it one technician's logs
 * produces exactly their tree.
 */
export function TechnicianDetailModal({
  user,
  currentUserId,
  isPending,
  onUserStatus,
  onDeleteUser,
  onClose,
}: TechnicianDetailModalProps) {
  const [detail, setDetail] = useState<TechnicianDetail | null>(null);
  const [history, setHistory] = useState<TechnicianLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openUnitId, setOpenUnitId] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isResetting, startResetTransition] = useTransition();

  // Escape backs out one layer: a unit's entries close before the panel does,
  // so a technician's tree does not vanish because someone wanted to collapse
  // the thing they had just opened.
  useEscapeToClose(() => {
    if (openUnitId) {
      setOpenUnitId(null);
      return;
    }
    onClose();
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await getTechnicianDetail(user.id);
        if (cancelled) return;
        if ("error" in res) {
          toast.error(res.error);
          onClose();
          return;
        }
        setDetail(res.user);
        setHistory(res.history);
      } catch {
        if (!cancelled) {
          toast.error("ไม่สามารถโหลดข้อมูลเจ้าหน้าที่ได้");
          onClose();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
    // Loaded once per person the panel is opened for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const buildings = useMemo(() => groupByBuilding(history), [history]);
  const isSelf = user.id === currentUserId;
  const RoleIcon = user.role === "technician" ? Wrench : Building2;

  function handleConfirmReset() {
    startResetTransition(async () => {
      const res = await adminResetUserPasswordAction(user.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("รีเซ็ตรหัสผ่านสำเร็จ ผู้ใช้ต้องตั้งรหัสผ่านใหม่ก่อนเข้าใช้งานครั้งถัดไป");
      setResetOpen(false);
    });
  }

  /** The units this technician touched in one room, each with their own entries. */
  function renderUnits(items: TechnicianLogRow[]) {
    const byUnit = new Map<string, TechnicianLogRow[]>();
    for (const row of items) {
      const existing = byUnit.get(row.airConditionerId);
      if (existing) existing.push(row);
      else byUnit.set(row.airConditionerId, [row]);
    }

    return (
      <div className="space-y-2">
        {[...byUnit.entries()].map(([acId, logs]) => {
          const open = openUnitId === acId;
          return (
            <div key={acId} className="overflow-hidden rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setOpenUnitId(open ? null : acId)}
                className="flex w-full items-center gap-2.5 bg-muted px-3 py-2.5 text-left hover:bg-secondary"
              >
                <UnitThumb src={logs[0].acPhotoUrl} alt={`เครื่อง ${logs[0].acCode}`} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-xs font-bold text-foreground">
                    {logs[0].acCode}
                  </span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {logs[0].acLabel} · เคยทำ {logs.length} ครั้ง
                  </span>
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                />
              </button>

              {open && (
                <ul className="divide-y divide-border">
                  {logs.map((log) => {
                    const action = log.action as MaintenanceAction;
                    const meta = { label: MAINTENANCE_ACTION_LABEL[action] ?? log.action, icon: ACTION_ICONS[action] ?? Wrench };
                    const ActionIcon = meta.icon;
                    return (
                      <li key={log.id} className="space-y-1.5 px-3 py-2.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-foreground">
                          <ActionIcon className="h-3 w-3 shrink-0" />
                          {meta.label}
                          <span className="ml-auto shrink-0 font-normal text-muted-foreground">
                            {format(new Date(log.performedAt), "dd/MM/yyyy HH:mm")}
                          </span>
                        </div>
                        {/* Which order the visit closed, if it closed one —
                            a walk-up visit has none and simply shows nothing. */}
                        {log.workOrder && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <WorkOrderTypeBadge type={log.workOrder.type} size="sm" />
                            <WorkOrderPriorityBadge priority={log.workOrder.priority} size="sm" />
                          </div>
                        )}
                        {log.workOrder?.issueDescription && (
                          <p className="text-[11px] text-muted-foreground">
                            อาการที่แจ้ง: {log.workOrder.issueDescription}
                          </p>
                        )}
                        {log.repairDetail && (
                          <p className="text-[11px] text-muted-foreground">
                            ซ่อม: {log.repairDetail}
                          </p>
                        )}
                        {log.notes && <p className="text-[11px] text-muted-foreground">{log.notes}</p>}
                        {/* The evidence itself. Said in words when there is
                            none, so an admin can tell "no pictures taken" from
                            "pictures that failed to load". */}
                        {log.beforePhotoUrl || log.afterPhotoUrl ? (
                          <EvidencePhotos before={log.beforePhotoUrl} after={log.afterPhotoUrl} size="sm" />
                        ) : (
                          <p className="text-[11px] text-muted-foreground">ไม่มีรูปจากการทำงาน</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 backdrop-blur-xs sm:items-center sm:p-4">
      <div className="flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl animate-in slide-in-from-bottom-full sm:rounded-2xl sm:slide-in-from-bottom-0 sm:fade-in">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-sm font-bold text-foreground">ข้อมูลเจ้าหน้าที่</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* One column on phones — a two-column split at 375px wide gives both
            halves too little to be readable. */}
        <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto p-6 md:grid-cols-[280px_1fr]">
          <div className="space-y-4">
            <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-primary text-primary-foreground">
              {user.avatarUrl ? (
                <Image src={user.avatarUrl} alt="" fill sizes="280px" className="object-cover" />
              ) : (
                <>
                  <RoleIcon className="absolute h-28 w-28 opacity-10" />
                  <span className="relative text-4xl font-bold">
                    {user.name.slice(0, 2).toUpperCase()}
                  </span>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-foreground">
                <RoleIcon className="h-3 w-3" />
                {user.role === "technician" ? "ช่างเทคนิค" : "ผู้ดูแลระบบ"}
              </span>
              <UserStatusBadge user={user} />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-bold text-foreground">{user.name}</p>
              <p className="flex items-center gap-1.5 break-all font-mono text-[11px] text-muted-foreground">
                <Mail className="h-3 w-3 shrink-0" />
                {user.email}
              </p>
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Phone className="h-3 w-3 shrink-0" />
                {detail?.phones.length
                  ? detail.phones.map((phone) => phone.number).join(" · ")
                  : "ยังไม่ได้ระบุ"}
              </p>
            </div>

            {/* The same actions the card carries. Duplicated on purpose:
                whichever of the two is on screen should be able to act. */}
            <div className="flex gap-2">
              {user.status === "active" ? (
                <button
                  type="button"
                  onClick={() => setSuspendOpen(true)}
                  disabled={isPending || isSelf}
                  title={isSelf ? "ระงับสิทธิ์บัญชีตัวเองไม่ได้" : undefined}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-2 text-[11px] font-bold text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-40"
                >
                  <ShieldOff className="h-3 w-3" />
                  ระงับสิทธิ์
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onUserStatus(user.id, "active")}
                  disabled={isPending}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-success/30 bg-success/10 px-2.5 py-2 text-[11px] font-bold text-success-foreground transition-colors hover:bg-success/20 disabled:opacity-40"
                >
                  <ShieldCheck className="h-3 w-3" />
                  เปิดใช้งาน
                </button>
              )}
              {user.status === "suspended" ? (
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  disabled={isPending}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-destructive/30 bg-background px-2.5 py-2 text-[11px] font-bold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-40"
                >
                  <Trash2 className="h-3 w-3" />
                  ลบออกจากระบบ
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setResetOpen(true)}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-border bg-muted px-2.5 py-2 text-[11px] font-bold text-foreground transition-colors hover:bg-secondary"
                >
                  <KeyRound className="h-3 w-3" />
                  รีเซ็ตรหัสผ่าน
                </button>
              )}
            </div>
          </div>

          <div className="min-w-0 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h4 className="text-sm font-bold text-foreground">ประวัติการทำงาน</h4>
              {!loading && (
                <span className="text-[11px] text-muted-foreground">{history.length} ครั้ง</span>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-[11px] text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                กำลังโหลดประวัติ
              </div>
            ) : history.length === 0 ? (
              <p className="py-12 text-center text-[11px] text-muted-foreground">
                ยังไม่มีประวัติการทำงานในระบบ
              </p>
            ) : (
              <BuildingGroupList<TechnicianLogRow>
                groups={buildings}
                emptyMessage="ยังไม่มีประวัติการทำงานในระบบ"
                getSubtitle={(group) => {
                  const units = new Set(group.items.map((row) => row.airConditionerId));
                  return `${group.items.length} ครั้ง • ${units.size} เครื่อง`;
                }}
                renderItems={(group) => (
                  <FloorGroupList<TechnicianLogRow>
                    floors={groupByFloor(group.items)}
                    getSubtitle={(floor) => {
                      const rooms = new Set(floor.items.map((row) => row.roomId));
                      return `${rooms.size} ห้อง • ${floor.items.length} ครั้ง`;
                    }}
                    renderItems={(floor) => (
                      <RoomGroupList<TechnicianLogRow>
                        rooms={groupByRoom(floor.items)}
                        getSubtitle={(room) => {
                          const units = new Set(room.items.map((row) => row.airConditionerId));
                          return `${units.size} เครื่อง • ${room.items.length} ครั้ง`;
                        }}
                        renderItems={(room) => renderUnits(room.items)}
                      />
                    )}
                  />
                )}
              />
            )}
          </div>
        </div>
      </div>

      <ConfirmActionDialog
        isOpen={resetOpen}
        onOpenChange={setResetOpen}
        title="ยืนยันการรีเซ็ตรหัสผ่าน"
        description={`ต้องการรีเซ็ตรหัสผ่านของ ${user.name} หรือไม่? ผู้ใช้จะต้องตั้งรหัสผ่านใหม่ก่อนเข้าใช้งานครั้งถัดไป`}
        confirmText="รีเซ็ตรหัสผ่าน"
        onConfirm={handleConfirmReset}
        isProcessing={isResetting}
      />

      <SuspendUserDialog
        target={suspendOpen ? user : null}
        onOpenChange={setSuspendOpen}
        onConfirm={() => {
          onUserStatus(user.id, "suspended");
          setSuspendOpen(false);
        }}
        isProcessing={isPending}
      />

      <DeleteUserDialog
        target={deleteOpen ? user : null}
        onOpenChange={setDeleteOpen}
        onConfirm={() => {
          onDeleteUser(user.id);
          setDeleteOpen(false);
        }}
        isProcessing={isPending}
      />
    </div>
  );
}
