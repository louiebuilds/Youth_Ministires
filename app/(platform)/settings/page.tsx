import { FoundationPlaceholder } from "@/components/feedback/foundation-placeholder";
import { requireCapability } from "@/features/auth/services/authorization-service";

export default async function SettingsPage() {
  await requireCapability("settings.manage");

  return (
    <FoundationPlaceholder
      description="Role-aware platform and ministry settings will be implemented after the authorization model is established."
      title="Settings"
    />
  );
}
