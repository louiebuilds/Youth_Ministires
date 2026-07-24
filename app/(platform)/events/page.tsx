import { FoundationPlaceholder } from "@/components/feedback/foundation-placeholder";
import { requireCapability } from "@/features/auth/services/authorization-service";

export default async function EventsPage() {
  await requireCapability("events.view");

  return (
    <FoundationPlaceholder
      description="Event planning, registration, and volunteer assignment tools will be implemented in the event-management milestone."
      title="Events"
    />
  );
}
