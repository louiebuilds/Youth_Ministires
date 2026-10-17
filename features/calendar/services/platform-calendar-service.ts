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
      itemType: item.item_type as "event" | "schedule" | "leadership",
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

export type LeadershipCalendarInput = {
  title: string;
  details: string | null;
  startsAt: string;
  endsAt: string;
  timezone: string;
};

type CalendarRpcClient = {
  rpc(name: string, args: Record<string, unknown>): Promise<{
    data: unknown;
    error: { code?: string } | null;
  }>;
};

async function calendarRpc(name: string, args: Record<string, unknown>) {
  return (await createClient() as unknown as CalendarRpcClient).rpc(name, args);
}

export async function createLeadershipCalendarEntry(input: LeadershipCalendarInput) {
  const { data, error } = await calendarRpc("create_leadership_calendar_entry", {
    p_title: input.title,
    p_details: input.details,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_timezone: input.timezone,
  });
  if (error) {
    console.error("create_leadership_calendar_entry failed", { code: error.code || "unknown" });
    return null;
  }
  return data as string;
}

export async function updateLeadershipCalendarEntry(entryId: string, input: LeadershipCalendarInput) {
  const { error } = await calendarRpc("update_leadership_calendar_entry", {
    p_entry_id: entryId,
    p_title: input.title,
    p_details: input.details,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_timezone: input.timezone,
  });
  if (error) {
    console.error("update_leadership_calendar_entry failed", { code: error.code || "unknown" });
    return false;
  }
  return true;
}

export async function deleteLeadershipCalendarEntry(entryId: string) {
  const { error } = await calendarRpc("delete_leadership_calendar_entry", { p_entry_id: entryId });
  if (error) {
    console.error("delete_leadership_calendar_entry failed", { code: error.code || "unknown" });
    return false;
  }
  return true;
}
