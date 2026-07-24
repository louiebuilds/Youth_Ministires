import { FoundationPlaceholder } from "@/components/feedback/foundation-placeholder";
import { requireCapability } from "@/features/auth/services/authorization-service";

export default async function StudentsPage() {
  await requireCapability("students.view");

  return (
    <FoundationPlaceholder
      description="Student records and ministry participation tools will be implemented in the student-management milestone."
      title="Students"
    />
  );
}
