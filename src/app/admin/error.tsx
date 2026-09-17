"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

/**
 * What the admin area shows when a page's data cannot be loaded.
 *
 * The single-page dashboard caught its own database errors and passed a
 * `dbError` string down to render a banner above the content. With nine pages
 * each loading their own data, catching in every loader would mean nine copies
 * of that, and every page would still have to decide what to render with no
 * data. An error boundary is the one place that handles it for all of them, and
 * it keeps the sidebar and header — which come from the layout — on screen.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin page failed to load:", error);
  }, [error]);

  return (
    <Alert className="border-warning/40 bg-warning/10 text-warning-foreground">
      <AnimatedIcon icon={AlertTriangle} size={16} animation="wiggle" className="text-warning" />
      <AlertTitle className="font-bold text-warning-foreground">ไม่สามารถโหลดข้อมูลหน้านี้ได้</AlertTitle>
      <AlertDescription className="text-warning-foreground/90 font-normal space-y-3">
        <p>
          หน้านี้อ่านข้อมูลจากฐานข้อมูลไม่สำเร็จ — ถ้าไม่มีใครใช้ระบบมาสักพัก
          ฐานข้อมูลอาจกำลังเปิดตัวเองอยู่ รอประมาณหนึ่งนาทีแล้วกดลองใหม่
        </p>
        <button
          onClick={reset}
          className="rounded-xl bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          ลองใหม่อีกครั้ง
        </button>
      </AlertDescription>
    </Alert>
  );
}
