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

/** The two priorities worth a badge; "low"/"normal" show nothing. */
export const WORK_ORDER_PRIORITY_LABEL: Record<"critical" | "high", string> = {
  critical: "ด่วนที่สุด (Critical)",
  high: "ด่วน (High)",
};
