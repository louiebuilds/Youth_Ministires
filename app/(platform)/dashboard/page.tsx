import type { Metadata } from "next";

import { requireCapability } from "@/features/auth/services/authorization-service";
import { MinistryDashboard } from "@/features/dashboard/components/ministry-dashboard";
import {
  syntheticFamilyDashboard,
  syntheticMinistryDashboard,
} from "@/features/dashboard/data/synthetic-ministry-dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const account = await requireCapability("dashboard.view");
  const dashboard =
    account.role === "parent"
      ? syntheticFamilyDashboard
      : syntheticMinistryDashboard;

  return <MinistryDashboard data={dashboard} />;
}
