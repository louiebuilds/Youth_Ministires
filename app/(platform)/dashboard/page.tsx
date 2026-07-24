import type { Metadata } from "next";

import { FoundationDashboard } from "@/features/dashboard/components/foundation-dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return <FoundationDashboard />;
}
