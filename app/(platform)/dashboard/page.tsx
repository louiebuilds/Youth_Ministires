import type { Metadata } from "next";

import { requireCapability } from "@/features/auth/services/authorization-service";
import { FoundationDashboard } from "@/features/dashboard/components/foundation-dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  await requireCapability("dashboard.view");

  return <FoundationDashboard />;
}
