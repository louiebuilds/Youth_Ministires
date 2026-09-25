import {
  hasCapability,
  type PlatformCapability,
} from "@/features/auth/types/authorization";
import type { AccountRole } from "@/lib/supabase/database.types";

export type NavigationIcon =
  | "attendance"
  | "calendar"
  | "check-in"
  | "communications"
  | "curriculum"
  | "dashboard"
  | "events"
  | "families"
  | "permission-forms"
  | "prayer-care"
  | "reports"
  | "resources"
  | "scheduling"
  | "settings"
  | "students"
  | "visitors"
  | "volunteers";

export type NavigationItem = Readonly<{
  capability: PlatformCapability;
  href: string;
  icon: NavigationIcon;
  label: string;
  roles?: readonly AccountRole[];
}>;

export const primaryNavigation: readonly NavigationItem[] = [
  {
    capability: "dashboard.view",
    href: "/dashboard",
    icon: "dashboard",
    label: "Dashboard",
  },
  {
    capability: "students.view",
    href: "/students",
    icon: "students",
    label: "Students",
  },
  {
    capability: "families.view",
    href: "/families",
    icon: "families",
    label: "Families",
  },
  {
    capability: "volunteers.view",
    href: "/volunteers",
    icon: "volunteers",
    label: "Volunteers",
  },
  {
    capability: "visitor_cards.manage",
    href: "/visitors",
    icon: "visitors",
    label: "Visitors",
  },
  {
    capability: "attendance.manage",
    href: "/attendance",
    icon: "attendance",
    label: "Attendance",
  },
  {
    capability: "check_in.manage",
    href: "/check-in",
    icon: "check-in",
    label: "Check-In",
  },
  {
    capability: "custom_forms.submit",
    href: "/permission-forms",
    icon: "permission-forms",
    label: "Forms",
  },
  {
    capability: "events.view",
    href: "/events",
    icon: "events",
    label: "Events",
  },
  {
    capability: "events.view",
    href: "/calendar",
    icon: "calendar",
    label: "Calendar",
  },
  {
    capability: "curriculum.view",
    href: "/curriculum",
    icon: "curriculum",
    label: "Curriculum",
  },
  {
    capability: "communications.view",
    href: "/communications",
    icon: "communications",
    label: "Communications",
  },
  {
    capability: "communications.view",
    href: "/communications/chat",
    icon: "communications",
    label: "Chat",
  },
  {
    capability: "prayer_care.view",
    href: "/prayer-care",
    icon: "prayer-care",
    label: "Prayer & Care",
  },
  {
    capability: "resource_library.view",
    href: "/resources",
    icon: "resources",
    label: "Resources",
  },
  {
    capability: "scheduling.view",
    href: "/scheduling",
    icon: "scheduling",
    label: "Scheduling",
  },
  {
    capability: "reports.view",
    href: "/reports",
    icon: "reports",
    label: "Reports",
  },
  {
    capability: "settings.manage",
    href: "/settings",
    icon: "settings",
    label: "Settings",
  },
];

export function getNavigationForRole(role: AccountRole) {
  return primaryNavigation.filter(
    (item) =>
      hasCapability(role, item.capability) ||
      item.roles?.includes(role),
  );
}