import { FoundationPlaceholder } from "@/components/feedback/foundation-placeholder";
import { requireCapability } from "@/features/auth/services/authorization-service";

export default async function FamiliesPage() {
  await requireCapability("families.view");

  return (
    <FoundationPlaceholder
      description="Family, guardian, and household relationship tools will be implemented in the family-management milestone."
      title="Families"
    />
  );
}
