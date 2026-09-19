import { AlertTriangle, Ban, CheckCircle2, Clock, Sparkles, Wrench } from "lucide-react";
import {
  WORK_ORDER_PRIORITY_LABEL,
  WORK_ORDER_STATUS_LABEL,
  WORK_ORDER_TYPE_LABEL,
} from "@/lib/labels";

/**
 * The pills that say what a work order is and where it stands, drawn once.
 *
 * The board's rows, its group headers and the detail dialog each carried
 * their own copies — eighteen spans whose colours and words agreed only for
 * as long as nobody edited one of them alone. They now share these three,
 * so a header count and the rows it summarises cannot drift apart.
 *
 * `count` turns the pill into a summary ("งานซ่อม 5") for a group header;
 * `size` scales it for where it sits. No React state, no client directive:
 * these render on the server as happily as on the client.
 */

type Size = "sm" | "md" | "lg";

// Shape per size; colour comes from the variant below.
const SIZE_CLASS: Record<Size, { pill: string; icon: string }> = {
  sm: { pill: "gap-1 px-2 py-0.5 text-[10px] whitespace-nowrap", icon: "h-3 w-3" },
  md: { pill: "gap-1 px-2.5 py-0.5 text-xs", icon: "h-3 w-3" },
  lg: { pill: "gap-1.5 px-3 py-1 text-xs", icon: "h-3.5 w-3.5" },
};

function Pill({
  tone,
  icon: Icon,
  label,
  count,
  size = "md",
}: {
  tone: string;
  icon: typeof Wrench;
  label: string;
  count?: number;
  size?: Size;
}) {
  const s = SIZE_CLASS[size];
  return (
    <span className={`inline-flex items-center rounded-full border font-bold ${s.pill} ${tone}`}>
      <Icon className={`${s.icon} shrink-0`} />
      {count === undefined ? label : `${label} ${count}`}
    </span>
  );
}

const TYPE_TONE = {
  repair: "border-destructive/20 bg-destructive/10 text-destructive",
  cleaning: "border-sky-500/20 bg-sky-500/10 text-sky-600",
} as const;

const STATUS_TONE = {
  pending: "border-warning/30 bg-warning/20 text-warning-foreground",
  claimed: "border-primary/30 bg-primary/20 text-primary",
  completed: "border-success/30 bg-success/20 text-success-foreground",
  cancelled: "border-border bg-muted text-muted-foreground",
} as const;

const STATUS_ICON = {
  pending: Clock,
  claimed: Wrench,
  completed: CheckCircle2,
  cancelled: Ban,
} as const;

const PRIORITY_TONE = {
  critical: "border-red-200 bg-red-100 text-red-800",
  high: "border-orange-200 bg-orange-100 text-orange-800",
} as const;

export function WorkOrderTypeBadge({
  type,
  count,
  size,
}: {
  type: "repair" | "cleaning";
  count?: number;
  size?: Size;
}) {
  return (
    <Pill
      tone={TYPE_TONE[type]}
      icon={type === "repair" ? Wrench : Sparkles}
      label={WORK_ORDER_TYPE_LABEL[type]}
      count={count}
      size={size}
    />
  );
}

/** Renders nothing for a status it does not know, rather than a blank pill. */
export function WorkOrderStatusBadge({
  status,
  count,
  size,
}: {
  status: string;
  count?: number;
  size?: Size;
}) {
  if (!(status in STATUS_TONE)) return null;
  const key = status as keyof typeof STATUS_TONE;
  return (
    <Pill
      tone={STATUS_TONE[key]}
      icon={STATUS_ICON[key]}
      label={WORK_ORDER_STATUS_LABEL[key]}
      count={count}
      size={size}
    />
  );
}

/** Only critical and high earn a pill; anything else is the quiet default. */
export function WorkOrderPriorityBadge({ priority, size }: { priority: string | null; size?: Size }) {
  if (priority !== "critical" && priority !== "high") return null;
  return (
    <Pill
      tone={PRIORITY_TONE[priority]}
      icon={AlertTriangle}
      label={WORK_ORDER_PRIORITY_LABEL[priority]}
      size={size}
    />
  );
}
