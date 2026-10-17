export type CalendarView = "month" | "week" | "agenda";

export type CalendarItem = {
  itemType: "event" | "schedule" | "leadership";
  itemId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  status: string;
  context: string | null;
  location: string | null;
  href: string;
  isPersonal: boolean;
  sourceEventId: string | null;
};

export type CalendarActionState = {
  success: boolean;
  message?: string;
};

export type CalendarResult =
  | { success: true; items: CalendarItem[] }
  | { success: false };
