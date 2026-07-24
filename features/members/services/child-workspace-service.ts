import "server-only";

import { childWorkspaceSchema } from "@/features/members/schemas/child-workspace-schema";
import { createClient } from "@/lib/supabase/server";

import type { ChildWorkspace } from "@/features/members/types/child-workspace";
import type { StudentStatus } from "@/lib/supabase/database.types";

export async function getChildWorkspace(
  studentId: string,
): Promise<
  | { success: true; child: ChildWorkspace }
  | { success: false; reason: "denied" | "unavailable" }
> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_child_workspace", {
      p_student_id: studentId,
    });

    if (error) {
      return {
        success: false,
        reason: error.code === "42501" || error.code === "22023"
          ? "denied"
          : "unavailable",
      };
    }

    const parsed = childWorkspaceSchema.safeParse(data);
    return parsed.success
      ? { success: true, child: parsed.data }
      : { success: false, reason: "unavailable" };
  } catch {
    return { success: false, reason: "unavailable" };
  }
}

export async function updateChildDetails(input: {
  studentId: string;
  firstName: string;
  preferredName: string | null;
  lastName: string;
  birthDate: string;
  grade: string;
  status: StudentStatus;
  medicalSummary: string | null;
  allergySummary: string | null;
  dietarySummary: string | null;
}) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_child_details", {
    p_student_id: input.studentId,
    p_first_name: input.firstName,
    p_preferred_name: input.preferredName,
    p_last_name: input.lastName,
    p_birth_date: input.birthDate,
    p_grade: input.grade,
    p_status: input.status,
    p_medical_summary: input.medicalSummary,
    p_allergy_summary: input.allergySummary,
    p_dietary_summary: input.dietarySummary,
  });
  return { success: !error };
}

export async function updateChildRelationship(input: {
  studentId: string;
  personId: string;
  relationshipType: string;
  isLegalGuardian: boolean;
  isEmergencyContact: boolean;
  isAuthorizedPickup: boolean;
  maySignPermissionForms: boolean;
  mayViewStudentInformation: boolean;
  receiveEmail: boolean;
  receiveSms: boolean;
}) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_child_relationship", {
    p_student_id: input.studentId,
    p_person_id: input.personId,
    p_relationship_type: input.relationshipType,
    p_is_legal_guardian: input.isLegalGuardian,
    p_is_emergency_contact: input.isEmergencyContact,
    p_is_authorized_pickup: input.isAuthorizedPickup,
    p_may_sign_permission_forms: input.maySignPermissionForms,
    p_may_view_student_information: input.mayViewStudentInformation,
    p_receive_email: input.receiveEmail,
    p_receive_sms: input.receiveSms,
  });
  return { success: !error };
}

export async function createChild(input: {
  householdId: string;
  guardianPersonId: string;
  firstName: string;
  preferredName: string | null;
  lastName: string;
  birthDate: string;
  grade: string;
  status: StudentStatus;
  medicalSummary: string | null;
  allergySummary: string | null;
  dietarySummary: string | null;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_child", {
    p_household_id: input.householdId,
    p_guardian_person_id: input.guardianPersonId,
    p_first_name: input.firstName,
    p_preferred_name: input.preferredName,
    p_last_name: input.lastName,
    p_birth_date: input.birthDate,
    p_grade: input.grade,
    p_status: input.status,
    p_medical_summary: input.medicalSummary,
    p_allergy_summary: input.allergySummary,
    p_dietary_summary: input.dietarySummary,
  });
  return error || !data
    ? { success: false as const }
    : { success: true as const, studentId: data };
}

export async function createMemberTag(name: string, color: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_member_tag", {
    p_name: name,
    p_color: color,
  });
  return { success: !error };
}

export async function setChildTags(studentId: string, tagIds: string[]) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_child_tags", {
    p_student_id: studentId,
    p_tag_ids: tagIds,
  });
  return { success: !error };
}
