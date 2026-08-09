export type LibraryResourceType = "document" | "image" | "video" | "other";
export type LibraryResourceAudience = "ministry" | "volunteer" | "family" | "all_authenticated";
export type LibraryResourceStatus = "draft" | "published" | "archived";

export type ResourceCategory = {
  categoryId: string;
  name: string;
  description: string | null;
  archivedAt: string | null;
};

export type LibraryResource = {
  resourceId: string;
  categoryId: string | null;
  categoryName: string | null;
  title: string;
  description: string | null;
  resourceType: LibraryResourceType;
  audience: LibraryResourceAudience;
  status: LibraryResourceStatus;
  currentVersionId: string | null;
  versionNumber: number | null;
  originalFileName: string | null;
  contentType: string | null;
  fileSizeBytes: number | null;
  updatedAt: string;
};

export type ResourceLibraryActionState = { success: boolean; message?: string };

export type LibraryResourceVersion = {
  versionId: string;
  versionNumber: number;
  isCurrent: boolean;
  originalFileName: string;
  contentType: string;
  fileSizeBytes: number;
  changeSummary: string | null;
  createdAt: string;
};
