import "server-only";

import { createClient } from "@/lib/supabase/server";

import type { CalendarResult } from "@/features/calendar/types/platform-calendar";

export async function listPlatformCalendar(
  fromDate: string,
  toDate: string,
): Promise<CalendarResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_platform_calendar", {
    p_from_date: fromDate,
    p_to_date: toDate,
  });

  if (error) {
    console.error("list_platform_calendar failed", {
      code: error.code || "unknown",
    });
    return { success: false };
  }

  return {
    success: true,
    items: (data ?? []).map((item) => ({
      itemType: item.item_type as "event" | "schedule",
      itemId: item.item_id,
      title: item.title,
      startsAt: item.starts_at,
      endsAt: item.ends_at,
      timezone: item.timezone,
      status: item.status,
      context: item.context,
      location: item.location,
      href: item.href,
      isPersonal: item.is_personal,
      sourceEventId: item.source_event_id,
    })),
  };
}
