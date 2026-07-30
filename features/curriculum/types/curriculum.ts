import type {
  CurriculumStatus,
  LessonStatus,
} from "@/lib/supabase/database.types";

export type CurriculumActionState = { success: boolean; message?: string };

export type LessonLibraryEntry = {
  lessonId: string;
  title: string;
  summary: string | null;
  scriptureReferences: string | null;
  audience: string | null;
  lessonStatus: LessonStatus;
  updatedAt: string;
  canManage: boolean;
};

export type LessonWorkspace = {
  lessonId: string;
  title: string;
  summary: string | null;
  teachingObjective: string | null;
  scriptureReferences: string | null;
  lessonBody: string | null;
  discussionGuide: string | null;
  preparationNotes: string | null;
  audience: string | null;
  status: LessonStatus;
  canManage: boolean;
};

export type CurriculumPlanEntry = {
  curriculumPlanId: string;
  title: string;
  summary: string | null;
  audience: string | null;
  curriculumStatus: CurriculumStatus;
  startsOn: string | null;
  endsOn: string | null;
  lessonCount: number;
  canManage: boolean;
};

export type CurriculumPlanWorkspace = {
  curriculumPlanId: string;
  title: string;
  summary: string | null;
  audience: string | null;
  status: CurriculumStatus;
  startsOn: string | null;
  endsOn: string | null;
  canManage: boolean;
};

export type CurriculumPlanLesson = {
  planLessonId: string;
  lessonId: string;
  lessonTitle: string;
  lessonStatus: LessonStatus;
  scriptureReferences: string | null;
  audience: string | null;
  sequenceNumber: number;
};

export type TeachingResource = {
  teachingResourceId: string;
  title: string;
  resourceType: "document" | "pdf" | "video" | "link" | "other";
  description: string | null;
  externalUrl: string | null;
  originalFileName: string | null;
  contentType: string | null;
  fileSizeBytes: number | null;
  hasFile: boolean;
};
