import { z } from "zod";

const optionalUuid = z.preprocess((value) => value == null || value === "" ? null : value, z.uuid().nullable());
const optionalText = (maximum: number) => z.preprocess(
  (value) => value === "" ? null : value,
  z.string().trim().min(1).max(maximum).nullable(),
);

export const categorySchema = z.object({
  categoryId: optionalUuid,
  name: z.string().trim().min(1).max(100),
  description: optionalText(1000),
});

export const categoryIdSchema = z.object({ categoryId: z.uuid() });

export const resourceSchema = z.object({
  categoryId: optionalUuid,
  title: z.string().trim().min(1).max(200),
  description: optionalText(4000),
  resourceType: z.enum(["document", "image", "video", "other"]),
  audience: z.enum(["ministry", "volunteer", "family", "all_authenticated"]),
});

export const resourceIdSchema = z.object({ resourceId: z.uuid() });

const uploadBase = z.object({
  resourceId: z.uuid(),
  resourceType: z.enum(["document", "image", "video", "other"]),
  originalFileName: z.string().trim().min(1).max(255),
  contentType: z.enum([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain", "image/jpeg", "image/png", "image/webp", "video/mp4",
  ]),
  fileSizeBytes: z.number().int().positive().max(262144000),
  changeSummary: z.string().trim().max(1000).transform((value) => value || null),
});

export const resourceUploadRequestSchema = uploadBase;
export const resourceUploadFinalizeSchema = uploadBase.extend({
  versionId: z.uuid(),
  storageObjectPath: z.string().min(1).max(500),
});

export const resourceDownloadSchema = z.object({
  resourceId: z.uuid(),
  versionId: optionalUuid,
});
