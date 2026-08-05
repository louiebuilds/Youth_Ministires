import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { CareFollowUp, CareNote, PublicPrayerSummary, VisiblePrayerRequest } from "@/features/prayer-care/types/prayer-care";
import type { PrayerRequestStatus, PrayerRequestVisibility } from "@/lib/supabase/database.types";

type PrayerRpcClient = {
  rpc(name: "list_prayer_care_assignees"): Promise<{ data: Array<{ profile_id: string; display_name: string; primary_role: string }> | null; error: unknown }>;
  rpc(name: "list_care_follow_ups", args: { p_search: null; p_status: null; p_priority: null; p_assigned_to_profile_id: null; p_person_id: null; p_include_archived: boolean }): Promise<{ data: Array<{
    care_follow_up_id: string; person_name: string; title: string; instructions: string | null;
    priority: CareFollowUp["priority"]; follow_up_status: CareFollowUp["status"];
    assigned_to_name: string; due_at: string | null; completion_notes: string | null;
    completed_at: string | null; cancellation_reason: string | null; cancelled_at: string | null;
  }> | null; error: unknown }>;
  rpc(name: "create_care_follow_up", args: { p_person_id: string; p_prayer_request_id: null; p_care_note_id: null; p_title: string; p_instructions: string | null; p_priority: CareFollowUp["priority"]; p_assigned_to_profile_id: string; p_due_at: string | null }): Promise<{ data: string | null; error: unknown }>;
  rpc(name: "complete_care_follow_up", args: { p_care_follow_up_id: string; p_completion_notes: string | null }): Promise<{ error: unknown }>;
  rpc(name: "cancel_care_follow_up", args: { p_care_follow_up_id: string; p_cancellation_reason: string }): Promise<{ error: unknown }>;
  rpc(name: "list_care_notes", args: { p_search: null; p_person_id: null; p_include_archived: boolean }): Promise<{ data: Array<{
    care_note_id: string; person_name: string; category_name: string | null;
    title: string; note_content: string; occurred_at: string; created_by_name: string;
  }> | null; error: unknown }>;
  rpc(name: "create_care_note", args: {
    p_person_id: string; p_category_id: string | null; p_title: string;
    p_note_content: string; p_occurred_at: string | null;
  }): Promise<{ data: string | null; error: unknown }>;
  rpc(name: "archive_care_note", args: { p_care_note_id: string }): Promise<{ error: unknown }>;
  rpc(name: "list_prayer_care_people", args: { p_search: string | null }): Promise<{ data: Array<{ person_id: string; display_name: string }> | null; error: unknown }>;
  rpc(name: "list_care_categories", args: { p_include_archived: boolean }): Promise<{ data: Array<{ category_id: string; name: string }> | null; error: unknown }>;
  rpc(name: "create_prayer_request", args: {
    p_person_id: string; p_category_id: string | null; p_title: string;
    p_request_details: string; p_visibility: PrayerRequestVisibility;
    p_assigned_to_profile_id: null;
  }): Promise<{ data: string | null; error: unknown }>;
  rpc(name: "answer_prayer_request", args: { p_prayer_request_id: string; p_answer_summary: string }): Promise<{ error: unknown }>;
  rpc(name: "archive_prayer_request", args: { p_prayer_request_id: string }): Promise<{ error: unknown }>;
  rpc(name: "list_public_prayer_summaries"): Promise<{ data: Array<{
    prayer_request_id: string; title: string; category_name: string | null;
    request_status: PrayerRequestStatus; created_at: string; answered_at: string | null;
  }> | null; error: unknown }>;
  rpc(name: "list_visible_prayer_requests", args: { p_include_archived: boolean }): Promise<{ data: Array<{
    prayer_request_id: string; person_id: string; person_name: string;
    category_id: string | null; category_name: string | null; title: string;
    request_details: string; visibility: PrayerRequestVisibility;
    request_status: PrayerRequestStatus; submitted_by_profile_id: string;
    assigned_to_profile_id: string | null; answer_summary: string | null;
    created_at: string; updated_at: string;
  }> | null; error: unknown }>;
};

export async function listPrayerCareAssignees() {
  const client = (await createClient()) as unknown as PrayerRpcClient;
  const { data, error } = await client.rpc("list_prayer_care_assignees");
  return error ? [] : (data ?? []).map((item) => ({ id: item.profile_id, name: item.display_name, role: item.primary_role }));
}

export async function listCareFollowUps(): Promise<CareFollowUp[]> {
  const client = (await createClient()) as unknown as PrayerRpcClient;
  const { data, error } = await client.rpc("list_care_follow_ups", { p_search: null, p_status: null, p_priority: null, p_assigned_to_profile_id: null, p_person_id: null, p_include_archived: false });
  if (error) return [];
  return (data ?? []).map((item) => ({ careFollowUpId: item.care_follow_up_id, personName: item.person_name, title: item.title, instructions: item.instructions, priority: item.priority, status: item.follow_up_status, assignedToName: item.assigned_to_name, dueAt: item.due_at, completionNotes: item.completion_notes, completedAt: item.completed_at, cancellationReason: item.cancellation_reason, cancelledAt: item.cancelled_at }));
}

export async function createCareFollowUp(input: { personId: string; title: string; instructions: string | null; priority: CareFollowUp["priority"]; assignedToProfileId: string; dueAt: string | null }) {
  const client = (await createClient()) as unknown as PrayerRpcClient;
  const { data, error } = await client.rpc("create_care_follow_up", { p_person_id: input.personId, p_prayer_request_id: null, p_care_note_id: null, p_title: input.title, p_instructions: input.instructions, p_priority: input.priority, p_assigned_to_profile_id: input.assignedToProfileId, p_due_at: input.dueAt });
  return !error && Boolean(data);
}

export async function completeCareFollowUp(id: string, notes: string | null) {
  const client = (await createClient()) as unknown as PrayerRpcClient;
  return !(await client.rpc("complete_care_follow_up", { p_care_follow_up_id: id, p_completion_notes: notes })).error;
}

export async function cancelCareFollowUp(id: string, reason: string) {
  const client = (await createClient()) as unknown as PrayerRpcClient;
  return !(await client.rpc("cancel_care_follow_up", { p_care_follow_up_id: id, p_cancellation_reason: reason })).error;
}

export async function listCareNotes(): Promise<CareNote[]> {
  const client = (await createClient()) as unknown as PrayerRpcClient;
  const { data, error } = await client.rpc("list_care_notes", {
    p_search: null, p_person_id: null, p_include_archived: false,
  });
  if (error) return [];
  return (data ?? []).map((item) => ({
    careNoteId: item.care_note_id, personName: item.person_name,
    categoryName: item.category_name, title: item.title,
    noteContent: item.note_content, occurredAt: item.occurred_at,
    createdByName: item.created_by_name,
  }));
}

export async function createCareNote(input: {
  personId: string; categoryId: string | null; title: string;
  noteContent: string; occurredAt: string | null;
}) {
  const client = (await createClient()) as unknown as PrayerRpcClient;
  const { data, error } = await client.rpc("create_care_note", {
    p_person_id: input.personId, p_category_id: input.categoryId,
    p_title: input.title, p_note_content: input.noteContent,
    p_occurred_at: input.occurredAt,
  });
  return !error && Boolean(data);
}

export async function archiveCareNote(id: string) {
  const client = (await createClient()) as unknown as PrayerRpcClient;
  return !(await client.rpc("archive_care_note", { p_care_note_id: id })).error;
}

export async function listPrayerCarePeople() {
  const client = (await createClient()) as unknown as PrayerRpcClient;
  const { data, error } = await client.rpc("list_prayer_care_people", { p_search: null });
  return error ? [] : (data ?? []).map((item) => ({ id: item.person_id, name: item.display_name }));
}

export async function listPrayerCareCategories() {
  const client = (await createClient()) as unknown as PrayerRpcClient;
  const { data, error } = await client.rpc("list_care_categories", { p_include_archived: false });
  return error ? [] : (data ?? []).map((item) => ({ id: item.category_id, name: item.name }));
}

export async function createPrayerRequest(input: {
  personId: string; categoryId: string | null; title: string;
  requestDetails: string; visibility: PrayerRequestVisibility;
}) {
  const client = (await createClient()) as unknown as PrayerRpcClient;
  const { data, error } = await client.rpc("create_prayer_request", {
    p_person_id: input.personId, p_category_id: input.categoryId,
    p_title: input.title, p_request_details: input.requestDetails,
    p_visibility: input.visibility, p_assigned_to_profile_id: null,
  });
  return !error && Boolean(data);
}

export async function answerPrayerRequest(prayerRequestId: string, answerSummary: string) {
  const client = (await createClient()) as unknown as PrayerRpcClient;
  const { error } = await client.rpc("answer_prayer_request", {
    p_prayer_request_id: prayerRequestId, p_answer_summary: answerSummary,
  });
  return !error;
}

export async function archivePrayerRequest(prayerRequestId: string) {
  const client = (await createClient()) as unknown as PrayerRpcClient;
  const { error } = await client.rpc("archive_prayer_request", { p_prayer_request_id: prayerRequestId });
  return !error;
}

export async function listPublicPrayerSummaries(): Promise<PublicPrayerSummary[]> {
  const client = (await createClient()) as unknown as PrayerRpcClient;
  const { data, error } = await client.rpc("list_public_prayer_summaries");
  if (error) return [];
  return (data ?? []).map((item) => ({
    prayerRequestId: item.prayer_request_id, title: item.title,
    categoryName: item.category_name, status: item.request_status,
    createdAt: item.created_at, answeredAt: item.answered_at,
  }));
}

export async function listVisiblePrayerRequests(): Promise<VisiblePrayerRequest[]> {
  const client = (await createClient()) as unknown as PrayerRpcClient;
  const { data, error } = await client.rpc("list_visible_prayer_requests", { p_include_archived: false });
  if (error) return [];
  return (data ?? []).map((item) => ({
    prayerRequestId: item.prayer_request_id, personId: item.person_id,
    personName: item.person_name, categoryId: item.category_id,
    categoryName: item.category_name, title: item.title,
    requestDetails: item.request_details, visibility: item.visibility,
    status: item.request_status, submittedByProfileId: item.submitted_by_profile_id,
    assignedToProfileId: item.assigned_to_profile_id,
    answerSummary: item.answer_summary, createdAt: item.created_at,
    updatedAt: item.updated_at, answeredAt: null,
  }));
}
