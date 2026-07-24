import type { StudentStatus } from "@/lib/supabase/database.types";

export type MemberTag = {
  id: string;
  name: string;
  color: string;
};

export type MemberDirectoryEntry = {
  studentId: string;
  displayName: string;
  householdId: string;
  householdName: string;
  grade: string;
  status: StudentStatus;
  tags: MemberTag[];
};

export type MemberDirectoryFilters = {
  search: string | null;
  status: StudentStatus | null;
  grade: string | null;
  tagId: string | null;
};
