import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  EventPermissionSlipRequirement,
  MedicalFormStatus,
} from "@/features/forms/types/medical-permission";

type RpcResult = { data: unknown; error: { message: string } | null };
async function rpc(name: string, args: Record<string, unknown> = {}) {
  const client = await createClient();
  return (client as unknown as { rpc: (n: string, a: Record<string, unknown>) => Promise<RpcResult> }).rpc(name, args);
}
function unwrap<T>(result: RpcResult): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

export async function listCurrentMedicalFormStatus(): Promise<MedicalFormStatus[]> {
  const rows = unwrap<Record<string, unknown>[]>(await rpc("list_current_medical_form_status")) ?? [];
  return rows.map((row) => ({
    studentId: String(row.student_id), studentName: String(row.student_name), householdId: String(row.household_id),
    schoolYearStart: String(row.school_year_start), schoolYearEnd: String(row.school_year_end),
    templateVersionId: String(row.template_version_id), submissionId: row.submission_id ? String(row.submission_id) : null,
    ready: Boolean(row.ready), state: row.state as Record<string, unknown> | null,
  }));
}

export async function getStudentCurrentMedicalFormStatus(studentId: string) {
  return unwrap<Record<string, unknown>>(await rpc("get_student_current_medical_form_status", { p_student_id: studentId }));
}

export async function setSchoolYearMedicalRequirement(schoolYearStart: string, templateVersionId: string) {
  unwrap(await rpc("set_school_year_medical_requirement", { p_school_year_start: schoolYearStart, p_template_version_id: templateVersionId }));
}

export async function getEventPermissionSlipRequirement(eventId: string): Promise<EventPermissionSlipRequirement> {
  const row = unwrap<Record<string, unknown>>(await rpc("get_event_permission_slip_requirement", { p_event_id: eventId }));
  return { required: Boolean(row.required), requirementId: row.requirementId ? String(row.requirementId) : null,
    templateVersionId: row.templateVersionId ? String(row.templateVersionId) : null,
    templateName: row.templateName ? String(row.templateName) : null, versionNumber: row.versionNumber ? Number(row.versionNumber) : null };
}

export async function setEventPermissionSlipRequirement(eventId: string, required: boolean, templateVersionId: string | null) {
  unwrap(await rpc("set_event_permission_slip_requirement", { p_event_id: eventId, p_required: required, p_template_version_id: templateVersionId }));
}
