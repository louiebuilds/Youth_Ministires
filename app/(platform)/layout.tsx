import { redirect } from "next/navigation";

import { AppHeader } from "@/components/layout/app-header";
import { AppShell } from "@/components/layout/app-shell";
import { AppSidebar } from "@/components/layout/app-sidebar";
import {
  getNavigationForRole,
  type NavigationItem,
} from "@/config/navigation-config";
import { getAuthenticatedAccount } from "@/features/auth/services/session-service";
import { roleLabels } from "@/features/auth/types/authorization";

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
    getNavigationForRole(
      account.role,
      account.hasActiveVolunteerProfile,
    );

  const myVolunteerItem:
    | NavigationItem
    | null =
    account.role === "parent" &&
    account.hasActiveVolunteerProfile
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