import { FoundationPlaceholder } from "@/components/feedback/foundation-placeholder";
import { requireCapability } from "@/features/auth/services/authorization-service";

export default async function PermissionFormsPage() {
  await requireCapability("permission_forms.manage");

  return (
    <FoundationPlaceholder
      description="Permission-form templates, submissions, and approval tracking will be implemented in a future milestone."
      title="Permission Forms"
    />
  );
}
