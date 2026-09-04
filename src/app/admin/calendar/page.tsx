import { CalendarClient } from "./calendar-client";

export const metadata = { title: "ปฏิทินซ่อมบำรุง | AC Maintenance System" };

/**
 * No loader: the calendar fetches its own schedules from
 * /api/admin/maintenance-schedules for the month on screen, and the create
 * modal it opens loads its lists on demand. This page reads nothing at all.
 */
export default function CalendarPage() {
  return <CalendarClient />;
}
