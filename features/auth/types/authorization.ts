import type { AccountRole } from "@/lib/supabase/database.types";

export type PlatformCapability =
  | "accounts.manage"
  | "attendance.manage"
  | "check_in.manage"
  | "communications.manage"
  | "communications.view"
  | "curriculum.view"
  | "dashboard.view"
  | "events.view"
  | "families.view"
  | "members.manage"
  | "forms.documents.manage"
  | "forms.documents.paper_confirm"
  | "forms.medical.view"
  | "forms.medical.verify"
  | "forms.participation.override"
  | "custom_forms.manage"
  | "custom_forms.submit"
  | "visitor_cards.manage"
  | "prayer_care.view"
  | "reports.view"
  | "resource_library.view"
  | "scheduling.view"
  | "settings.manage"
  | "students.view"
  | "volunteers.view";

const roleCapabilities = {
  parent: [
    "dashboard.view",
    "students.view",
    "families.view",
    "events.view",
    "communications.view",
    "custom_forms.submit",
    "prayer_care.view",
    "resource_library.view",
  ],
  platform_administrator: [
    "accounts.manage",
    "dashboard.view",
    "students.view",
    "families.view",
    "members.manage",
    "volunteers.view",
    "attendance.manage",
    "check_in.manage",
    "forms.documents.manage",
    "forms.documents.paper_confirm",
    "forms.medical.view",
    "forms.medical.verify",
    "forms.participation.override",
    "custom_forms.manage",
    "custom_forms.submit",
    "visitor_cards.manage",
    "prayer_care.view",
    "resource_library.view",
    "scheduling.view",
    "events.view",
    "communications.manage",
    "communications.view",
    "curriculum.view",
    "reports.view",
    "settings.manage",
  ],
  staff_member: [
    "dashboard.view",
    "students.view",
    "families.view",
    "members.manage",
    "volunteers.view",
    "attendance.manage",
    "check_in.manage",
    "forms.documents.manage",
    "forms.documents.paper_confirm",
    "custom_forms.manage",
    "custom_forms.submit",
    "visitor_cards.manage",
    "prayer_care.view",
    "resource_library.view",
    "scheduling.view",
    "events.view",
    "communications.manage",
    "communications.view",
    "prayer_care.view",
    "curriculum.view",
    "reports.view",
  ],
  volunteer: [
    "dashboard.view",
    "curriculum.view",
    "volunteers.view",
    "attendance.manage",
    "check_in.manage",
    "events.view",
    "communications.view",
    "resource_library.view",
    "scheduling.view",
    "custom_forms.submit",
  ],
  youth_pastor: [
    "dashboard.view",
    "curriculum.view",
    "students.view",
    "families.view",
    "members.manage",
    "volunteers.view",
    "attendance.manage",
    "check_in.manage",
    "forms.documents.manage",
    "forms.documents.paper_confirm",
    "forms.medical.view",
    "forms.medical.verify",
    "forms.participation.override",
    "custom_forms.manage",
    "custom_forms.submit",
    "visitor_cards.manage",
    "prayer_care.view",
    "resource_library.view",
    "scheduling.view",
    "events.view",
    "communications.manage",
    "communications.view",
    "reports.view",
    "settings.manage",
  ],
} as const satisfies Record<AccountRole, readonly PlatformCapability[]>;

export const roleLabels = {
  parent: "Parent or Guardian",
  platform_administrator: "Platform Administrator",
  staff_member: "Staff Member",
  volunteer: "Volunteer",
  youth_pastor: "Youth Pastor",
} as const satisfies Record<AccountRole, string>;

export function hasCapability(
  role: AccountRole,
  capability: PlatformCapability,
) {
  const capabilities: readonly PlatformCapability[] = roleCapabilities[role];

  return capabilities.includes(capability);
}
