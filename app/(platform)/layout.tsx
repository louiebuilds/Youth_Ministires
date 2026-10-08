import { redirect } from "next/navigation";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppShell } from "@/components/layout/app-shell";
import {
  getNavigationForRole,
  type NavigationItem,
} from "@/config/navigation-config";
import { getAuthenticatedAccount } from "@/features/auth/services/session-service";
import { roleLabels } from "@/features/auth/types/authorization";
import { getOwnActiveVolunteerProfile } from "@/features/volunteers/services/volunteer-management-service";

export default async function PlatformLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const account =
    await getAuthenticatedAccount();

  if (!account) {
    redirect("/login");
  }

  const baseNavigation =
    getNavigationForRole(account.role);

  const volunteerProfile =
    account.role === "parent"
      ? await getOwnActiveVolunteerProfile(
          account.id,
        )
      : null;

  const myVolunteerItem:
    | NavigationItem
    | null = volunteerProfile
    ? {
        capability: "dashboard.view",
        href: `/volunteers/${account.id}`,
        icon: "volunteers",
        label: "My Volunteer",
      }
    : null;

  const navigation =
    myVolunteerItem
      ? [
          ...baseNavigation.slice(0, 3),
          myVolunteerItem,
          ...baseNavigation.slice(3),
        ]
      : baseNavigation;

  return (
    <AppShell
      header={
        <AppHeader
          email={account.email}
          navigation={navigation}
          roleLabel={
            roleLabels[account.role]
          }
        />
      }
      sidebar={
        <AppSidebar
          navigation={navigation}
        />
      }
    >
      {children}
    </AppShell>
  );
}