import type { MaintenanceAction } from "@/generated/prisma/enums";

// Thai wording shared by more than one screen. Kept in a module with no
// server-side imports so a client component can pull a label without dragging
// Prisma along, and so changing a word is one edit rather than a hunt for
// every copy — the action labels below used to live separately in the sticker
// page and the history modal, spelled identically, which is exactly the setup
// that lets two pages drift apart the first time one of them is edited.

/** What a maintenance log's `action` is called on screen. */
export const MAINTENANCE_ACTION_LABEL: Record<MaintenanceAction, string> = {
  cleaning: "ล้างแอร์",
  repair: "ซ่อมแซม",
  refill_refrigerant: "เติมน้ำยาแอร์",
};

/** What a user account's `status` is called on the team and approvals pages. */
export const USER_STATUS_LABEL: Record<string, string> = {
  active: "ใช้งานอยู่",
  pending: "รออนุมัติ",
  suspended: "ถูกระงับ",
};

/**
 * What an active account's badge says instead of USER_STATUS_LABEL.active:
 * whether the person is signed in and on a dashboard now (lib/presence.ts).
 */
export const USER_PRESENCE_LABEL = {
  online: "Online",
  offline: "Offline",
} as const;

/**
 * A calendar date the way the admin tables show it, in the viewer's locale
 * settings for Thai. Client-side only: the tables that call this render in
 * the browser, where the local time zone is the right one. Server components
 * go through `inAppTimeZone()` in @/lib/maintenance instead, because Vercel
 * runs in UTC.
 */
export function formatThaiDate(value: string | Date | null | undefined, fallback = "-"): string {
  if (!value) return fallback;
  return new Date(value).toLocaleDateString("th-TH");
}

/** What a work order's `type` is called on the admin screens. */
export const WORK_ORDER_TYPE_LABEL: Record<"repair" | "cleaning", string> = {
  repair: "งานซ่อม",
  cleaning: "งานล้างแอร์",
};

/** What a work order's `status` is called on the admin screens. */
export const WORK_ORDER_STATUS_LABEL: Record<"pending" | "claimed" | "completed" | "cancelled", string> = {
  pending: "รอดำเนินการ",
  claimed: "กำลังดำเนินการ",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิกแล้ว",
};

/**
 * What an air conditioner's `status` is called, on every screen that shows it
 * (admin assets, the sticker page, the technician's units). It used to be
 * three spellings — เสีย / แจ้งซ่อม / รอซ่อม for the same state — and the
 * admin card printed the raw enum. รอซ่อม matches "รอซ่อมด่วน" on the dashboard.
 */
export const AC_STATUS_LABEL: Record<"normal" | "needs_cleaning" | "broken", string> = {
  normal: "ปกติ",
  needs_cleaning: "รอล้าง",
  broken: "รอซ่อม",
};

/**
 * The badge colours for AC_STATUS_LABEL on the app's own surfaces, from the
 * status tokens in globals.css. Red text is spelled out rather than taken from
 * --destructive-foreground, which is too dark on a dark card (a11y round 2).
 */
export const AC_STATUS_TONE: Record<keyof typeof AC_STATUS_LABEL, string> = {
  normal: "border-success/30 bg-success/20 text-success-foreground",
  needs_cleaning: "border-warning/30 bg-warning/20 text-warning-foreground",
  broken: "border-destructive/30 bg-destructive/10 text-red-700 dark:text-red-300",
};

const isAcStatus = (status: string): status is keyof typeof AC_STATUS_LABEL => status in AC_STATUS_LABEL;

/** AC_STATUS_LABEL, falling back to the stored value for one it does not know. */
export function acStatusLabel(status: string): string {
  return isAcStatus(status) ? AC_STATUS_LABEL[status] : status;
}

/** AC_STATUS_TONE, falling back to a neutral badge for an unknown status. */
export function acStatusTone(status: string): string {
  return isAcStatus(status) ? AC_STATUS_TONE[status] : "border-border bg-muted text-muted-foreground";
}

/** The two priorities worth a badge; "low"/"normal" show nothing. */
export const WORK_ORDER_PRIORITY_LABEL: Record<"critical" | "high", string> = {
  critical: "ด่วนที่สุด (Critical)",
  high: "ด่วน (High)",
};
