import { FoundationPlaceholder } from "@/components/feedback/foundation-placeholder";
import { requireCapability } from "@/features/auth/services/authorization-service";

export default async function VolunteersPage() {
  await requireCapability("volunteers.view");

  return (
    <FoundationPlaceholder
      description="Volunteer profiles and event assignments will be implemented in a future ministry-operations milestone."
      title="Volunteers"
    />
  );
}
