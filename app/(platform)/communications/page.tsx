import { FoundationPlaceholder } from "@/components/feedback/foundation-placeholder";
import { requireCapability } from "@/features/auth/services/authorization-service";

export default async function CommunicationsPage() {
  await requireCapability("communications.manage");

  return (
    <FoundationPlaceholder
      description="Parent, volunteer, email, and SMS communication tools will be implemented in the communications milestone."
      title="Communications"
    />
  );
}
