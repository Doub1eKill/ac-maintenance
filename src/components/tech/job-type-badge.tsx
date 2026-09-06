import { Droplets, Wrench } from "lucide-react";

// What kind of work a job is, on the job card itself.
//
// The three technician lists showed a unit code, a brand and a date, and
// nowhere among them what the job was actually for — a technician claimed a
// job, walked to the room and only found out on arrival whether they were
// there to clean or to fix something.
//
// Same wrench/droplet pairing the asset list already uses for its per-room
// counts, so the two screens describe the same thing the same way. Kept as one
// component because all three lists render it and a fourth will too.
export function JobTypeBadge({ type }: { type?: "repair" | "cleaning" }) {
  // Nothing rather than a guess: the QR scan result builds a job without a
  // type, and "งานล้าง" on a repair is worse than no label at all.
  if (!type) return null;

  const isRepair = type === "repair";
  const Icon = isRepair ? Wrench : Droplets;

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
        isRepair ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning-foreground"
      }`}
    >
      <Icon className="h-3 w-3" />
      {isRepair ? "งานซ่อม" : "งานล้าง"}
    </span>
  );
}
