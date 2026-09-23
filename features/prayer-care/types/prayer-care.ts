import type { PrayerRequestStatus, PrayerRequestVisibility } from "@/lib/supabase/database.types";

export type PublicPrayerSummary = {
  prayerRequestId: string;
  title: string;
  categoryName: string | null;
  status: PrayerRequestStatus;
  createdAt: string;
  answeredAt: string | null;
};

export type VisiblePrayerRequest = PublicPrayerSummary & {
  personId: string;
  personName: string;
  categoryId: string | null;
  requestDetails: string;
  visibility: PrayerRequestVisibility;
  submittedByProfileId: string;
  assignedToProfileId: string | null;
  answerSummary: string | null;
  updatedAt: string;
};

export type CareNote = {
  careNoteId: string;
  personId: string;
  personName: string;
  categoryId: string | null;
  categoryName: string | null;
  title: string;
  noteContent: string;
  occurredAt: string;
  createdByName: string;
  archivedAt: string | null;
  updatedAt: string;
};

export type CareFollowUp = {
  careFollowUpId: string; personId: string; personName: string; title: string;
  prayerRequestId: string | null; prayerRequestTitle: string | null;
  careNoteId: string | null; careNoteTitle: string | null;
  instructions: string | null; priority: "low" | "normal" | "high" | "urgent";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  assignedToName: string; dueAt: string | null;
  completionNotes: string | null; completedAt: string | null;
  completedByName: string | null;
  cancellationReason: string | null; cancelledAt: string | null;
  cancelledByName: string | null;
  assignedToProfileId: string; archivedAt: string | null; createdAt: string; updatedAt: string;
};

export type PrayerCareListResult<T> =
  | { success: true; data: T }
  | { success: false; data: T; message: string };
