import type { Metadata } from "next";

import { getNavigationForRole } from "@/config/navigation-config";
import { requireCapability } from "@/features/auth/services/authorization-service";
import { MinistryDashboard } from "@/features/dashboard/components/ministry-dashboard";
import { ParentDashboard } from "@/features/dashboard/components/parent-dashboard";
import { VolunteerDashboard } from "@/features/dashboard/components/volunteer-dashboard";
import { getLiveMinistryDashboard } from "@/features/dashboard/services/ministry-dashboard-service";
import { getParentDashboardData } from "@/features/dashboard/services/parent-dashboard-service";
import { getVolunteerDashboardData } from "@/features/dashboard/services/volunteer-dashboard-service";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const account = await requireCapability("dashboard.view");
  if (account.role === "parent") {
    const parentDashboard = await getParentDashboardData(account.id);
    return <ParentDashboard data={parentDashboard} />;
  }

  if (account.role === "volunteer") {
    const volunteerDashboard = await getVolunteerDashboardData(account.id);
    return <VolunteerDashboard data={volunteerDashboard} />;
  }

  let dashboard = await getLiveMinistryDashboard();

  const navigationDestinations = new Set(
    getNavigationForRole(account.role).map((item) => item.href),
  );
  dashboard = {
    ...dashboard,
    quickActions: dashboard.quickActions.filter((action) =>
      navigationDestinations.has(action.href)
    ),
  };

  return <MinistryDashboard data={dashboard} />;
}
