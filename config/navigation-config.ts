export type NavigationIcon =
  | "attendance"
  | "check-in"
  | "communications"
  | "dashboard"
  | "events"
  | "families"
  | "permission-forms"
  | "reports"
  | "settings"
  | "students"
  | "volunteers";

export type NavigationItem = Readonly<{
  href: string;
  icon: NavigationIcon;
  label: string;
}>;

export const primaryNavigation: readonly NavigationItem[] = [
  {
    href: "/dashboard",
    icon: "dashboard",
    label: "Dashboard",
  },
  {
    href: "/students",
    icon: "students",
    label: "Students",
  },
  {
    href: "/families",
    icon: "families",
    label: "Families",
  },
  {
    href: "/volunteers",
    icon: "volunteers",
    label: "Volunteers",
  },
  {
    href: "/attendance",
    icon: "attendance",
    label: "Attendance",
  },
  {
    href: "/check-in",
    icon: "check-in",
    label: "Check-In",
  },
  {
    href: "/permission-forms",
    icon: "permission-forms",
    label: "Permission Forms",
  },
  {
    href: "/events",
    icon: "events",
    label: "Events",
  },
  {
    href: "/communications",
    icon: "communications",
    label: "Communications",
  },
  {
    href: "/reports",
    icon: "reports",
    label: "Reports",
  },
  {
    href: "/settings",
    icon: "settings",
    label: "Settings",
  },
];
