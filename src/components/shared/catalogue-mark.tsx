import { AlertTriangle } from "lucide-react";

interface CatalogueMarkProps {
  brandDeleted?: boolean;
  modelDeleted?: boolean;
  className?: string;
}

// Marks a unit whose brand or model has been retired from the catalogue
// (backlog #4 phase 2). Soft delete keeps the name readable everywhere, which
// is the point — the unit still works and its history has to stay intact — but
// it also means nothing on screen tells you which units are still pointing at
// something that was taken off the list. This is that "something".
//
// One mark per unit rather than one per field: the two names are usually drawn
// as a single line ("Carrier • ZI-5618"), and two identical triangles side by
// side would read as two separate problems. The tooltip says which of them it
// is, so nothing is lost by drawing it once.
//
// Deliberately quiet — a small warning-toned icon, not a red badge. Nothing is
// broken and there is nothing for the technician to do about it; it is a note
// for whoever maintains the catalogue that this unit still needs moving.
export function CatalogueMark({ brandDeleted, modelDeleted, className }: CatalogueMarkProps) {
  if (!brandDeleted && !modelDeleted) return null;

  const subject =
    brandDeleted && modelDeleted ? "ยี่ห้อและรุ่นนี้" : brandDeleted ? "ยี่ห้อนี้" : "รุ่นนี้";
  const label = `${subject}ถูกลบออกจากรายการหลักแล้ว (เครื่องนี้ยังใช้งานได้ปกติ)`;

  return (
    <span
      title={label}
      aria-label={label}
      role="img"
      className={`inline-flex shrink-0 items-center align-text-bottom text-warning ${className ?? ""}`}
    >
      <AlertTriangle className="h-3 w-3" />
    </span>
  );
}
