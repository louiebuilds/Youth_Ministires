import { redirect } from "next/navigation";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppShell } from "@/components/layout/app-shell";
import { getAuthenticatedAccount } from "@/features/auth/services/session-service";

export default async function PlatformLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const account = await getAuthenticatedAccount();

  if (!account) {
    redirect("/login");
  }

  return (
    <AppShell
      header={<AppHeader email={account.email} />}
      sidebar={<AppSidebar />}
    >
      {children}
    </AppShell>
  );
}
