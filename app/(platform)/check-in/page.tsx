import { FoundationPlaceholder } from "@/components/feedback/foundation-placeholder";
import { requireCapability } from "@/features/auth/services/authorization-service";

export default async function CheckInPage() {
  await requireCapability("check_in.manage");

  return (
    <FoundationPlaceholder
      description="Secure student check-in and check-out workflows will be implemented in the check-in milestone."
      title="Check-In"
    />
  );
}
