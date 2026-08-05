export type NavigationIcon =
  | "attendance"
  | "check-in"
  | "communications"
  | "curriculum"
  | "dashboard"
  | "events"
  | "families"
  | "permission-forms"
  | "prayer-care"
  | "reports"
  | "settings"
  | "students"
  | "volunteers";

export type NavigationItem = Readonly<{
  capability: PlatformCapability;
  href: string;
  icon: NavigationIcon;
  label: string;
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
    capability: "permission_forms.manage",
    href: "/permission-forms",
    icon: "permission-forms",
    label: "Permission Forms",
  },
  {
    capability: "events.view",
    href: "/events",
    icon: "events",
    label: "Events",
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
    capability: "prayer_care.view",
    href: "/prayer-care",
    icon: "prayer-care",
    label: "Prayer & Care",
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
  return primaryNavigation.filter((item) =>
    hasCapability(role, item.capability),
  );
}
import type { AccountRole } from "@/lib/supabase/database.types";
import {
  hasCapability,
  type PlatformCapability,
} from "@/features/auth/types/authorization";
