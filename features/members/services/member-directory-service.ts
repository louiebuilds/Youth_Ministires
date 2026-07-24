import "server-only";

import { createClient } from "@/lib/supabase/server";

import type {
  MemberDirectoryEntry,
  MemberDirectoryFilters,
  MemberTag,
} from "@/features/members/types/member-directory";

type DirectoryResult =
  | { success: true; members: MemberDirectoryEntry[] }
  | { success: false };

function parseTags(value: unknown): MemberTag[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((tag) => {
    if (
      typeof tag !== "object" ||
      tag === null ||
      !("id" in tag) ||
      !("name" in tag) ||
      !("color" in tag) ||
      typeof tag.id !== "string" ||
      typeof tag.name !== "string" ||
      typeof tag.color !== "string"
    ) {
      return [];
    }

    return [{ id: tag.id, name: tag.name, color: tag.color }];
  });
}

export async function listMemberDirectory(
  filters: MemberDirectoryFilters,
): Promise<DirectoryResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("list_member_directory", {
      p_search: filters.search,
      p_status: filters.status,
      p_grade: filters.grade,
      p_tag_id: filters.tagId,
    });

    if (error) {
      return { success: false };
    }

    return {
      success: true,
      members: (data ?? []).map((member) => ({
        studentId: member.student_id,
        displayName: member.display_name,
        householdId: member.household_id,
        householdName: member.household_name,
        grade: member.grade,
        status: member.status,
        tags: parseTags(member.tags),
      })),
    };
  } catch {
    return { success: false };
  }
}

export async function listMemberTags(): Promise<MemberTag[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("member_tags")
      .select("id, name, color")
      .order("name")
      .limit(100);

    if (error) {
      return [];
    }

    return data;
  } catch {
    return [];
  }
}
