import { z } from "zod";

export const createCommunityPostSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(5000),
});

export const createCommunityCommentSchema = z.object({
  postId: z.string().uuid(),
  body: z.string().trim().min(1).max(3000),
});
