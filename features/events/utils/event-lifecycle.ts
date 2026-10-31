import type { EventStatus } from "@/lib/supabase/database.types";

export function eventDisplayStatus(status: EventStatus, endsAt: string, now = new Date()) {
  if (status === "completed") return "Completed";
  if (status === "archived") return "Archived";
  if (new Date(endsAt).getTime() <= now.getTime()) return "Past";
  return status === "draft" ? "Draft" : "Upcoming";
}

export function eventHasEnded(endsAt: string, now = new Date()) {
  return new Date(endsAt).getTime() <= now.getTime();
}
