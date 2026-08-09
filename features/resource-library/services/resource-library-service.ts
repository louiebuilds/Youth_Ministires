import "server-only";

import { randomUUID } from "node:crypto";

import { createClient } from "@/lib/supabase/server";
import type {
  LibraryResource,
  LibraryResourceAudience,
  LibraryResourceStatus,
  LibraryResourceType,
  LibraryResourceVersion,
  ResourceCategory,
} from "@/features/resource-library/types/resource-library";

type RpcResult<T> = Promise<{ data: T | null; error: unknown }>;
type ResourceRpcClient = {
  rpc(name: "list_resource_categories", args: { p_include_archived: boolean }): RpcResult<Array<{ category_id: string; category_name: string; category_description: string | null; archived_at: string | null }>>;
  rpc(name: "create_resource_category", args: { p_name: string; p_description: string | null }): RpcResult<string>;
  rpc(name: "update_resource_category", args: { p_category_id: string; p_name: string; p_description: string | null }): RpcResult<null>;
  rpc(name: "archive_resource_category", args: { p_category_id: string }): RpcResult<null>;
  rpc(name: "list_library_resources", args: { p_search: string | null; p_category_id: string | null; p_resource_type: LibraryResourceType | null; p_audience: LibraryResourceAudience | null; p_status: LibraryResourceStatus | null; p_include_archived: boolean }): RpcResult<Array<{
    resource_id: string; category_id: string | null; category_name: string | null;
    title: string; description: string | null; resource_type: LibraryResourceType;
    audience: LibraryResourceAudience; resource_status: LibraryResourceStatus;
    current_version_id: string | null; current_version_number: number | null;
    original_file_name: string | null; content_type: string | null;
    file_size_bytes: number | null; updated_at: string;
  }>>;
  rpc(name: "create_library_resource", args: { p_category_id: string | null; p_title: string; p_description: string | null; p_resource_type: LibraryResourceType; p_audience: LibraryResourceAudience }): RpcResult<string>;
  rpc(name: "publish_library_resource", args: { p_resource_id: string }): RpcResult<null>;
  rpc(name: "archive_library_resource", args: { p_resource_id: string }): RpcResult<null>;
  rpc(name: "create_library_resource_version", args: { p_version_id: string; p_resource_id: string; p_storage_object_path: string; p_original_file_name: string; p_content_type: string; p_file_size_bytes: number; p_checksum_sha256: null; p_change_summary: string | null }): RpcResult<number>;
  rpc(name: "list_library_resource_versions", args: { p_resource_id: string }): RpcResult<Array<{ version_id: string; version_number: number; is_current: boolean; original_file_name: string; content_type: string; file_size_bytes: number; change_summary: string | null; created_at: string }>>;
  rpc(name: "authorize_library_resource_download", args: { p_resource_id: string; p_version_id: string | null }): RpcResult<Record<string, unknown>>;
};

async function client() {
  return (await createClient()) as unknown as ResourceRpcClient;
}

export async function listResourceCategories(includeArchived = false): Promise<ResourceCategory[]> {
  const { data, error } = await (await client()).rpc("list_resource_categories", { p_include_archived: includeArchived });
  if (error) return [];
  return (data ?? []).map((item) => ({ categoryId: item.category_id, name: item.category_name, description: item.category_description, archivedAt: item.archived_at }));
}

export async function createResourceCategory(name: string, description: string | null) {
  const { data, error } = await (await client()).rpc("create_resource_category", { p_name: name, p_description: description });
  return !error && Boolean(data);
}

export async function updateResourceCategory(id: string, name: string, description: string | null) {
  return !(await (await client()).rpc("update_resource_category", { p_category_id: id, p_name: name, p_description: description })).error;
}

export async function archiveResourceCategory(id: string) {
  return !(await (await client()).rpc("archive_resource_category", { p_category_id: id })).error;
}

export async function listLibraryResources(filters: {
  search: string | null; categoryId: string | null; resourceType: LibraryResourceType | null;
  audience: LibraryResourceAudience | null; status: LibraryResourceStatus | null; includeArchived: boolean;
}): Promise<LibraryResource[]> {
  const { data, error } = await (await client()).rpc("list_library_resources", {
    p_search: filters.search, p_category_id: filters.categoryId,
    p_resource_type: filters.resourceType, p_audience: filters.audience,
    p_status: filters.status, p_include_archived: filters.includeArchived,
  });
  if (error) return [];
  return (data ?? []).map((item) => ({
    resourceId: item.resource_id, categoryId: item.category_id,
    categoryName: item.category_name, title: item.title, description: item.description,
    resourceType: item.resource_type, audience: item.audience,
    status: item.resource_status, currentVersionId: item.current_version_id,
    versionNumber: item.current_version_number, originalFileName: item.original_file_name,
    contentType: item.content_type, fileSizeBytes: item.file_size_bytes,
    updatedAt: item.updated_at,
  }));
}

export async function createLibraryResource(input: { categoryId: string | null; title: string; description: string | null; resourceType: LibraryResourceType; audience: LibraryResourceAudience }) {
  const { data, error } = await (await client()).rpc("create_library_resource", {
    p_category_id: input.categoryId, p_title: input.title, p_description: input.description,
    p_resource_type: input.resourceType, p_audience: input.audience,
  });
  return !error && Boolean(data);
}

export async function publishLibraryResource(id: string) {
  return !(await (await client()).rpc("publish_library_resource", { p_resource_id: id })).error;
}

export async function archiveLibraryResource(id: string) {
  return !(await (await client()).rpc("archive_library_resource", { p_resource_id: id })).error;
}

type UploadInput = { resourceId: string; resourceType: LibraryResourceType; originalFileName: string; contentType: string; fileSizeBytes: number; changeSummary: string | null };

export async function prepareLibraryResourceUpload(input: UploadInput) {
  const supabase = await createClient();
  const versionId = randomUUID();
  const extension = input.originalFileName.toLowerCase().match(/\.(pdf|docx|pptx|xlsx|txt|jpg|jpeg|png|webp|mp4)$/)?.[1];
  if (!extension) return { success: false as const };
  const storageObjectPath = `${input.resourceId}/${versionId}/upload.${extension}`;
  const { data, error } = await supabase.storage.from("resource-library").createSignedUploadUrl(storageObjectPath);
  return error ? { success: false as const } : { success: true as const, versionId, storageObjectPath, token: data.token };
}

export async function finalizeLibraryResourceUpload(input: UploadInput & { versionId: string; storageObjectPath: string }) {
  const { error } = await (await client()).rpc("create_library_resource_version", {
    p_version_id: input.versionId, p_resource_id: input.resourceId,
    p_storage_object_path: input.storageObjectPath,
    p_original_file_name: input.originalFileName, p_content_type: input.contentType,
    p_file_size_bytes: input.fileSizeBytes, p_checksum_sha256: null,
    p_change_summary: input.changeSummary,
  });
  return !error;
}

export async function listLibraryResourceVersions(resourceId: string): Promise<LibraryResourceVersion[]> {
  const { data, error } = await (await client()).rpc("list_library_resource_versions", { p_resource_id: resourceId });
  if (error) return [];
  return (data ?? []).map((item) => ({ versionId: item.version_id, versionNumber: item.version_number, isCurrent: item.is_current, originalFileName: item.original_file_name, contentType: item.content_type, fileSizeBytes: item.file_size_bytes, changeSummary: item.change_summary, createdAt: item.created_at }));
}

export async function createLibraryResourceDownloadUrl(resourceId: string, versionId: string | null) {
  const supabase = await createClient();
  const clientRpc = supabase as unknown as ResourceRpcClient;
  const { data, error } = await clientRpc.rpc("authorize_library_resource_download", { p_resource_id: resourceId, p_version_id: versionId });
  if (error || !data || typeof data.bucket !== "string" || typeof data.objectPath !== "string" || typeof data.fileName !== "string") return null;
  const signed = await supabase.storage.from(data.bucket).createSignedUrl(data.objectPath, 60, { download: data.fileName });
  return signed.error ? null : signed.data.signedUrl;
}
