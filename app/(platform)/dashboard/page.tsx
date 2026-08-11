import type { Metadata } from "next";

import { requireCapability } from "@/features/auth/services/authorization-service";
import { MinistryDashboard } from "@/features/dashboard/components/ministry-dashboard";
import {
  syntheticFamilyDashboard,
  syntheticMinistryDashboard,
} from "@/features/dashboard/data/synthetic-ministry-dashboard";
import { getReportingOverview } from "@/features/reporting/services/reporting-service";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const account = await requireCapability("dashboard.view");
  const isReportingManager = account.role === "platform_administrator" ||
    account.role === "youth_pastor" || account.role === "staff_member";
  let dashboard = account.role === "parent"
    ? syntheticFamilyDashboard : syntheticMinistryDashboard;
  if (isReportingManager) {
    const today = new Date();
    const from = new Date(today); from.setUTCDate(from.getUTCDate()-29);
    const overview = await getReportingOverview(
      from.toISOString().slice(0,10), today.toISOString().slice(0,10),
    );
    dashboard = {
      ...syntheticMinistryDashboard,
      dataSource: "hybrid",
      metrics: [
        { label:"Unique youth attending", value:String(overview.uniqueYouth), detail:"Last 30 days · finalized present attendance", tone:"sky" },
        { label:"Upcoming events", value:String(overview.upcomingEvents), detail:"Published or active future events", tone:"violet" },
        { label:"Volunteer coverage", value:`${overview.filledPositions} / ${overview.requiredPositions}`, detail:`${overview.coveragePercentage}% Scheduling coverage`, tone:"emerald" },
        { label:"Event registrations", value:String(overview.registrations), detail:"Last 30 days · separate from attendance", tone:"amber" },
        { label:"First-time participants", value:String(overview.firstTimeParticipants), detail:"First finalized attendance in the last 30 days", tone:"rose" },
        { label:"New youth added", value:String(overview.newYouthAdded), detail:"Student records created in the last 30 days", tone:"slate" },
      ],
      volunteerStatus: {
        confirmed: overview.filledPositions,
        needed: overview.unfilledPositions,
        pending: 0,
      },
    };
  }

  return <MinistryDashboard data={dashboard} />;
}
