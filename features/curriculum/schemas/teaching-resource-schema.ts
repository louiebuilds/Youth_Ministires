import { z } from "zod";

export const teachingResourceLinkSchema = z.object({
  lessonId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  resourceType: z.enum(["video", "link", "other"]),
  description: z.string().trim().max(2000)
    .transform((value) => value || null),
  externalUrl: z.string().trim().url().max(2000)
    .refine((value) => value.startsWith("https://"), {
      message: "Use an HTTPS link.",
    }),
});

export const archiveTeachingResourceSchema = z.object({
  lessonId: z.string().uuid(),
  teachingResourceId: z.string().uuid(),
});

export const teachingResourceUploadRequestSchema = z.object({
  lessonId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  resourceType: z.enum(["document", "pdf", "video", "other"]),
  description: z.string().trim().max(2000)
    .transform((value) => value || null),
  originalFileName: z.string().trim().min(1).max(255),
  contentType: z.enum([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "video/mp4",
  ]),
  fileSizeBytes: z.number().int().positive().max(262144000),
});

export const teachingResourceUploadFinalizeSchema =
  teachingResourceUploadRequestSchema.extend({
    teachingResourceId: z.string().uuid(),
    storageObjectPath: z.string().min(1).max(500),
  });

export const downloadTeachingResourceSchema = z.object({
  teachingResourceId: z.string().uuid(),
});
