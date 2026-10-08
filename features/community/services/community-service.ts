import "server-only";

import { createClient } from "@/lib/supabase/server";

import type { Database, Tables } from "@/lib/supabase/database.types";

type CommunityCategoryRow = Tables<"community_categories">;
type CommunityPostRow = Tables<"community_posts">;
type CommunityCommentRow = Tables<"community_comments">;
type CommunityLifecycleStatus = "published" | "hidden" | "removed";

type CommunityCategoryRelation = Pick<
  CommunityCategoryRow,
  "id" | "slug" | "name" | "description"
>;

type CommunityPostReadRow = CommunityPostRow & {
  category: CommunityCategoryRelation;
  comments: Array<{ count: number }>;
};

type CommunityCommentReadRow = CommunityCommentRow;

type CommunityAuthorNameRow = {
  profile_id: string;
  display_name: string;
};

type CommunitySupabaseClient = {
  rpc: (
    functionName: "get_community_author_display_names",
    args: {
      p_profile_ids: string[];
    },
  ) => PromiseLike<{
    data: CommunityAuthorNameRow[] | null;
    error: unknown;
  }>;
};

export type CommunityCategory = {
  categoryId: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
};

export type CommunityModerationDetails = {
  moderatedAt: string;
  moderatedByProfileId: string | null;
  reason: string | null;
};

export type CommunityPost = {
  postId: string;
  category: Omit<CommunityCategory, "sortOrder">;
  authorProfileId: string;
  authorDisplayName: string;
  title: string;
  body: string;
  lifecycleStatus: CommunityLifecycleStatus;
  isPinned: boolean;
  isLocked: boolean;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  moderation: CommunityModerationDetails | null;
};

export type CommunityComment = {
  commentId: string;
  postId: string;
  authorProfileId: string;
  authorDisplayName: string;
  body: string;
  lifecycleStatus: CommunityLifecycleStatus;
  createdAt: string;
  updatedAt: string;
  moderation: CommunityModerationDetails | null;
};

type CreateCommunityPostArgs =
  Database["public"]["Functions"]["create_community_post"]["Args"];

type UpdateCommunityPostArgs =
  Database["public"]["Functions"]["update_community_post"]["Args"];

type CreateCommunityCommentArgs =
  Database["public"]["Functions"]["create_community_comment"]["Args"];

type UpdateCommunityCommentArgs =
  Database["public"]["Functions"]["update_community_comment"]["Args"];

const postSelect = `
  id,
  author_profile_id,
  category_id,
  title,
  body,
  lifecycle_status,
  is_pinned,
  is_locked,
  created_at,
  updated_at,
  moderated_at,
  moderated_by_profile_id,
  moderation_reason,
  category:community_categories!community_posts_category_id_fkey (
    id,
    slug,
    name,
    description
  ),
  comments:community_comments (count)
`;

const commentSelect = `
  id,
  post_id,
  author_profile_id,
  body,
  lifecycle_status,
  created_at,
  updated_at,
  moderated_at,
  moderated_by_profile_id,
  moderation_reason
`;

function moderationDetails(
  row: Pick<
    CommunityPostRow | CommunityCommentRow,
    "moderated_at" | "moderated_by_profile_id" | "moderation_reason"
  >,
): CommunityModerationDetails | null {
  if (!row.moderated_at) {
    return null;
  }

  return {
    moderatedAt: row.moderated_at,
    moderatedByProfileId: row.moderated_by_profile_id,
    reason: row.moderation_reason,
  };
}

function fallbackAuthorName() {
  return "Community member";
}

async function getCommunityAuthorDisplayNames(
  profileIds: string[],
): Promise<Map<string, string>> {
  const uniqueProfileIds = Array.from(
    new Set(
      profileIds.filter(
        (profileId) => profileId.length > 0,
      ),
    ),
  );

  if (uniqueProfileIds.length === 0) {
    return new Map();
  }

  const supabase = await createClient();

  /*
   * This RPC was added after the current generated Supabase TypeScript types.
   * Keep the temporary cast on the client until database.types.ts is
   * regenerated.
   */
  const communitySupabase =
    supabase as unknown as CommunitySupabaseClient;

  const { data, error } =
    await communitySupabase.rpc(
      "get_community_author_display_names",
      {
        p_profile_ids: uniqueProfileIds,
      },
    );

  if (error || !data) {
    return new Map();
  }

  return new Map(
    data.map((row) => [
      row.profile_id,
      row.display_name?.trim() ||
        fallbackAuthorName(),
    ]),
  );
}

function mapPost(
  row: CommunityPostReadRow,
  authorNames: ReadonlyMap<string, string>,
): CommunityPost {
  return {
    postId: row.id,
    category: {
      categoryId: row.category.id,
      slug: row.category.slug,
      name: row.category.name,
      description: row.category.description,
    },
    authorProfileId: row.author_profile_id,
    authorDisplayName:
      authorNames.get(row.author_profile_id) ??
      fallbackAuthorName(),
    title: row.title,
    body: row.body,
    lifecycleStatus:
      row.lifecycle_status as CommunityLifecycleStatus,
    isPinned: row.is_pinned,
    isLocked: row.is_locked,
    commentCount: row.comments[0]?.count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    moderation: moderationDetails(row),
  };
}

function mapComment(
  row: CommunityCommentReadRow,
  authorNames: ReadonlyMap<string, string>,
): CommunityComment {
  return {
    commentId: row.id,
    postId: row.post_id,
    authorProfileId: row.author_profile_id,
    authorDisplayName:
      authorNames.get(row.author_profile_id) ??
      fallbackAuthorName(),
    body: row.body,
    lifecycleStatus:
      row.lifecycle_status as CommunityLifecycleStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    moderation: moderationDetails(row),
  };
}

export async function listCommunityCategories(): Promise<
  CommunityCategory[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("community_categories")
    .select("id, slug, name, description, sort_order")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");

  if (error) {
    return [];
  }

  return data.map((category) => ({
    categoryId: category.id,
    slug: category.slug,
    name: category.name,
    description: category.description,
    sortOrder: category.sort_order,
  }));
}

export async function listCommunityPosts(): Promise<
  CommunityPost[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("community_posts")
    .select(postSelect)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return [];
  }

  const rows = data as CommunityPostReadRow[];

  const authorNames =
    await getCommunityAuthorDisplayNames(
      rows.map((row) => row.author_profile_id),
    );

  return rows.map((row) =>
    mapPost(row, authorNames),
  );
}

export async function getCommunityPost(
  postId: string,
): Promise<CommunityPost | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("community_posts")
    .select(postSelect)
    .eq("id", postId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as CommunityPostReadRow;

  const authorNames =
    await getCommunityAuthorDisplayNames([
      row.author_profile_id,
    ]);

  return mapPost(row, authorNames);
}

export async function listCommunityComments(
  postId: string,
): Promise<CommunityComment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("community_comments")
    .select(commentSelect)
    .eq("post_id", postId)
    .order("created_at");

  if (error) {
    return [];
  }

  const rows = data as CommunityCommentReadRow[];

  const authorNames =
    await getCommunityAuthorDisplayNames(
      rows.map((row) => row.author_profile_id),
    );

  return rows.map((row) =>
    mapComment(row, authorNames),
  );
}

export async function createCommunityPost(input: {
  categoryId: string;
  title: string;
  body: string;
}) {
  const args: CreateCommunityPostArgs = {
    p_category_id: input.categoryId,
    p_title: input.title,
    p_body: input.body,
  };

  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "create_community_post",
    args,
  );

  return error || !data
    ? { success: false as const }
    : {
        success: true as const,
        postId: data,
      };
}

export async function updateCommunityPost(
  postId: string,
  input: {
    categoryId: string;
    title: string;
    body: string;
  },
) {
  const args: UpdateCommunityPostArgs = {
    p_post_id: postId,
    p_category_id: input.categoryId,
    p_title: input.title,
    p_body: input.body,
  };

  const supabase = await createClient();

  return !(
    await supabase.rpc(
      "update_community_post",
      args,
    )
  ).error;
}

export async function removeCommunityPost(
  postId: string,
) {
  const supabase = await createClient();

  return !(
    await supabase.rpc(
      "remove_community_post",
      {
        p_post_id: postId,
      },
    )
  ).error;
}

export async function createCommunityComment(input: {
  postId: string;
  body: string;
}) {
  const args: CreateCommunityCommentArgs = {
    p_post_id: input.postId,
    p_body: input.body,
  };

  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "create_community_comment",
    args,
  );

  return error || !data
    ? { success: false as const }
    : {
        success: true as const,
        commentId: data,
      };
}

export async function updateCommunityComment(
  commentId: string,
  body: string,
) {
  const args: UpdateCommunityCommentArgs = {
    p_comment_id: commentId,
    p_body: body,
  };

  const supabase = await createClient();

  return !(
    await supabase.rpc(
      "update_community_comment",
      args,
    )
  ).error;
}

export async function removeCommunityComment(
  commentId: string,
) {
  const supabase = await createClient();

  return !(
    await supabase.rpc(
      "remove_community_comment",
      {
        p_comment_id: commentId,
      },
    )
  ).error;
}

export async function setCommunityPostPinned(
  postId: string,
  isPinned: boolean,
) {
  const supabase = await createClient();

  return !(
    await supabase.rpc(
      "set_community_post_pinned",
      {
        p_post_id: postId,
        p_is_pinned: isPinned,
      },
    )
  ).error;
}

export async function setCommunityPostLocked(
  postId: string,
  isLocked: boolean,
) {
  const supabase = await createClient();

  return !(
    await supabase.rpc(
      "set_community_post_locked",
      {
        p_post_id: postId,
        p_is_locked: isLocked,
      },
    )
  ).error;
}

export async function moderateCommunityPost(
  postId: string,
  status: CommunityLifecycleStatus,
  reason: string | null,
) {
  const supabase = await createClient();

  return !(
    await supabase.rpc(
      "moderate_community_post",
      {
        p_post_id: postId,
        p_status: status,
        p_reason: reason,
      },
    )
  ).error;
}

export async function moderateCommunityComment(
  commentId: string,
  status: CommunityLifecycleStatus,
  reason: string | null,
) {
  const supabase = await createClient();

  return !(
    await supabase.rpc(
      "moderate_community_comment",
      {
        p_comment_id: commentId,
        p_status: status,
        p_reason: reason,
      },
    )
  ).error;
}