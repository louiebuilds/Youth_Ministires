"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireCapability } from "@/features/auth/services/authorization-service";
import {
  createCommunityCommentSchema,
  createCommunityPostSchema,
} from "@/features/community/schemas/community-schema";
import {
  createCommunityComment,
  createCommunityPost,
  moderateCommunityComment,
  moderateCommunityPost,
  removeCommunityComment,
  removeCommunityPost,
  setCommunityPostLocked,
  setCommunityPostPinned,
  updateCommunityComment,
  updateCommunityPost,
} from "@/features/community/services/community-service";

export type CommunityActionState = {
  success: boolean;
  message?: string;
};

export async function createCommunityPostAction(
  _state: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  await requireCapability("community.participate");

  const parsed = createCommunityPostSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!parsed.success) {
    return {
      success: false,
      message: "Choose a category and review the title and discussion text.",
    };
  }

  const result = await createCommunityPost(parsed.data);

  if (!result.success) {
    return {
      success: false,
      message: "The discussion could not be started. Please try again.",
    };
  }

  revalidatePath("/community");
  redirect("/community?created=1");
}

export async function createCommunityCommentAction(
  _state: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  await requireCapability("community.participate");

  const parsed = createCommunityCommentSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!parsed.success) {
    return {
      success: false,
      message: "Enter a reply between 1 and 3,000 characters.",
    };
  }

  const result = await createCommunityComment(parsed.data);

  if (!result.success) {
    return {
      success: false,
      message: "The reply could not be posted. The discussion may be locked.",
    };
  }

  const postPath = `/community/${parsed.data.postId}`;

  revalidatePath("/community");
  revalidatePath(postPath);

  redirect(`${postPath}?comment=1`);
}

export async function updateCommunityPostAction(
  _state: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  await requireCapability("community.participate");

  const postIdValue = formData.get("postId");

  if (
    typeof postIdValue !== "string" ||
    postIdValue.trim().length === 0
  ) {
    return {
      success: false,
      message: "The discussion could not be identified.",
    };
  }

  const parsed = createCommunityPostSchema.safeParse({
    categoryId: formData.get("categoryId"),
    title: formData.get("title"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Choose a category and review the title and discussion text.",
    };
  }

  const postId = postIdValue.trim();

  const success = await updateCommunityPost(postId, parsed.data);

  if (!success) {
    return {
      success: false,
      message:
        "The discussion could not be updated. You may no longer be able to edit it.",
    };
  }

  const postPath = `/community/${postId}`;

  revalidatePath("/community");
  revalidatePath(postPath);

  redirect(`${postPath}?updated=1`);
}

export async function removeCommunityPostAction(
  formData: FormData,
): Promise<void> {
  await requireCapability("community.participate");

  const parsedPostId = z
    .string()
    .uuid()
    .safeParse(formData.get("postId"));

  if (!parsedPostId.success) {
    redirect("/community?removeError=1");
  }

  const success = await removeCommunityPost(
    parsedPostId.data,
  );

  if (!success) {
    redirect(
      `/community/${parsedPostId.data}?removeError=1`,
    );
  }

  revalidatePath("/community");
  revalidatePath(
    `/community/${parsedPostId.data}`,
  );

  redirect("/community?removed=1");
}

export async function updateCommunityCommentAction(
  _state: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  await requireCapability("community.participate");

  const parsedCommentId = z
    .string()
    .uuid()
    .safeParse(formData.get("commentId"));

  const parsedPostId = z
    .string()
    .uuid()
    .safeParse(formData.get("postId"));

  const parsedBody = z
    .string()
    .trim()
    .min(1)
    .max(3000)
    .safeParse(formData.get("body"));

  if (
    !parsedCommentId.success ||
    !parsedPostId.success ||
    !parsedBody.success
  ) {
    return {
      success: false,
      message: "Enter a reply between 1 and 3,000 characters.",
    };
  }

  const success = await updateCommunityComment(
    parsedCommentId.data,
    parsedBody.data,
  );

  if (!success) {
    return {
      success: false,
      message:
        "The reply could not be updated. You may no longer be able to edit it.",
    };
  }

  const postPath = `/community/${parsedPostId.data}`;

  revalidatePath("/community");
  revalidatePath(postPath);

  redirect(
    `${postPath}?commentUpdated=${parsedCommentId.data}`,
  );
}

export async function removeCommunityCommentAction(
  formData: FormData,
): Promise<void> {
  await requireCapability("community.participate");

  const parsedCommentId = z
    .string()
    .uuid()
    .safeParse(formData.get("commentId"));

  const parsedPostId = z
    .string()
    .uuid()
    .safeParse(formData.get("postId"));

  if (
    !parsedCommentId.success ||
    !parsedPostId.success
  ) {
    redirect("/community?commentRemoveError=1");
  }

  const success = await removeCommunityComment(
    parsedCommentId.data,
  );

  const postPath = `/community/${parsedPostId.data}`;

  if (!success) {
    redirect(`${postPath}?commentRemoveError=1`);
  }

  revalidatePath("/community");
  revalidatePath(postPath);

  redirect(`${postPath}?commentRemoved=1`);
}

export async function setCommunityPostPinnedAction(
  formData: FormData,
): Promise<void> {
  await requireCapability("community.moderate");

  const parsedPostId = z
    .string()
    .uuid()
    .safeParse(formData.get("postId"));

  const parsedPinned = z
    .enum(["true", "false"])
    .safeParse(formData.get("isPinned"));

  if (
    !parsedPostId.success ||
    !parsedPinned.success
  ) {
    redirect("/community?moderationError=1");
  }

  const isPinned =
    parsedPinned.data === "true";

  const success = await setCommunityPostPinned(
    parsedPostId.data,
    isPinned,
  );

  const postPath = `/community/${parsedPostId.data}`;

  if (!success) {
    redirect(`${postPath}?moderationError=1`);
  }

  revalidatePath("/community");
  revalidatePath(postPath);

  redirect(
    `${postPath}?${isPinned ? "pinned" : "unpinned"}=1`,
  );
}

export async function setCommunityPostLockedAction(
  formData: FormData,
): Promise<void> {
  await requireCapability("community.moderate");

  const parsedPostId = z
    .string()
    .uuid()
    .safeParse(formData.get("postId"));

  const parsedLocked = z
    .enum(["true", "false"])
    .safeParse(formData.get("isLocked"));

  if (
    !parsedPostId.success ||
    !parsedLocked.success
  ) {
    redirect("/community?moderationError=1");
  }

  const isLocked =
    parsedLocked.data === "true";

  const success = await setCommunityPostLocked(
    parsedPostId.data,
    isLocked,
  );

  const postPath = `/community/${parsedPostId.data}`;

  if (!success) {
    redirect(`${postPath}?moderationError=1`);
  }

  revalidatePath("/community");
  revalidatePath(postPath);

  redirect(
    `${postPath}?${isLocked ? "locked" : "unlocked"}=1`,
  );
}

export async function setCommunityPostHiddenAction(
  formData: FormData,
): Promise<void> {
  await requireCapability("community.moderate");

  const parsedPostId = z
    .string()
    .uuid()
    .safeParse(formData.get("postId"));

  const parsedHidden = z
    .enum(["true", "false"])
    .safeParse(formData.get("isHidden"));

  if (
    !parsedPostId.success ||
    !parsedHidden.success
  ) {
    redirect("/community?moderationError=1");
  }

  const isHidden =
    parsedHidden.data === "true";

  const success = await moderateCommunityPost(
    parsedPostId.data,
    isHidden ? "hidden" : "published",
    isHidden
      ? "Hidden by Community moderator."
      : "Restored by Community moderator.",
  );

  const postPath = `/community/${parsedPostId.data}`;

  if (!success) {
    redirect(`${postPath}?moderationError=1`);
  }

  revalidatePath("/community");
  revalidatePath(postPath);

  redirect(
    `${postPath}?${isHidden ? "hidden" : "restored"}=1`,
  );
}

export async function moderatorRemoveCommunityPostAction(
  formData: FormData,
): Promise<void> {
  await requireCapability("community.moderate");

  const parsedPostId = z
    .string()
    .uuid()
    .safeParse(formData.get("postId"));

  if (!parsedPostId.success) {
    redirect("/community?moderationError=1");
  }

  const success = await moderateCommunityPost(
    parsedPostId.data,
    "removed",
    "Removed by Community moderator.",
  );

  if (!success) {
    redirect(
      `/community/${parsedPostId.data}?moderationError=1`,
    );
  }

  revalidatePath("/community");
  revalidatePath(
    `/community/${parsedPostId.data}`,
  );

  redirect("/community?moderatorRemoved=1");
}

export async function setCommunityCommentHiddenAction(
  formData: FormData,
): Promise<void> {
  await requireCapability("community.moderate");

  const parsedCommentId = z
    .string()
    .uuid()
    .safeParse(formData.get("commentId"));

  const parsedPostId = z
    .string()
    .uuid()
    .safeParse(formData.get("postId"));

  const parsedHidden = z
    .enum(["true", "false"])
    .safeParse(formData.get("isHidden"));

  if (
    !parsedCommentId.success ||
    !parsedPostId.success ||
    !parsedHidden.success
  ) {
    redirect("/community?moderationError=1");
  }

  const isHidden =
    parsedHidden.data === "true";

  const success = await moderateCommunityComment(
    parsedCommentId.data,
    isHidden ? "hidden" : "published",
    isHidden
      ? "Hidden by Community moderator."
      : "Restored by Community moderator.",
  );

  const postPath = `/community/${parsedPostId.data}`;

  if (!success) {
    redirect(`${postPath}?moderationError=1`);
  }

  revalidatePath("/community");
  revalidatePath(postPath);

  redirect(
    `${postPath}?${
      isHidden ? "commentHidden" : "commentRestored"
    }=${parsedCommentId.data}`,
  );
}

export async function moderatorRemoveCommunityCommentAction(
  formData: FormData,
): Promise<void> {
  await requireCapability("community.moderate");

  const parsedCommentId = z
    .string()
    .uuid()
    .safeParse(formData.get("commentId"));

  const parsedPostId = z
    .string()
    .uuid()
    .safeParse(formData.get("postId"));

  if (
    !parsedCommentId.success ||
    !parsedPostId.success
  ) {
    redirect("/community?moderationError=1");
  }

  const success = await moderateCommunityComment(
    parsedCommentId.data,
    "removed",
    "Removed by Community moderator.",
  );

  const postPath = `/community/${parsedPostId.data}`;

  if (!success) {
    redirect(`${postPath}?moderationError=1`);
  }

  revalidatePath("/community");
  revalidatePath(postPath);

  redirect(
    `${postPath}?moderatorCommentRemoved=1`,
  );
}