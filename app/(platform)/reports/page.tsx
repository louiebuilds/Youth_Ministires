import { FoundationPlaceholder } from "@/components/feedback/foundation-placeholder";
import { requireCapability } from "@/features/auth/services/authorization-service";

export default async function ReportsPage() {
  await requireCapability("reports.view");

  return (
    <FoundationPlaceholder
      description="Authorized ministry reports and exports will be implemented after their supporting data modules are available."
      title="Reports"
    />
  );
}
