import { TechCalendarClient } from "./calendar-client";

export const metadata = { title: "ปฏิทินซ่อมบำรุง | AC Maintenance System" };

/** Reads nothing: the calendar fetches its own schedules for the month shown. */
export default function TechCalendarPage() {
  return <TechCalendarClient />;
}
