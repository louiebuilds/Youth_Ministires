import { redirect } from "next/navigation";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppShell } from "@/components/layout/app-shell";
import { getNavigationForRole } from "@/config/navigation-config";
import { getAuthenticatedAccount } from "@/features/auth/services/session-service";
import { roleLabels } from "@/features/auth/types/authorization";

export default async function PlatformLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const account = await getAuthenticatedAccount();

  if (!account) {
    redirect("/login");
  }

  const navigation = getNavigationForRole(account.role);

  return (
    <AppShell
      header={
        <AppHeader
          email={account.email}
          navigation={navigation}
          roleLabel={roleLabels[account.role]}
        />
      }
      sidebar={<AppSidebar navigation={navigation} />}
    >
      {children}
    </AppShell>
  );
}
