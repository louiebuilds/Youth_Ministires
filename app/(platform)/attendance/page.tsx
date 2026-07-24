import { FoundationPlaceholder } from "@/components/feedback/foundation-placeholder";
import { requireCapability } from "@/features/auth/services/authorization-service";

export default async function AttendancePage() {
  await requireCapability("attendance.manage");

  return (
    <FoundationPlaceholder
      description="Attendance sessions, rosters, and corrections will be implemented in the attendance milestone."
      title="Attendance"
    />
  );
}
