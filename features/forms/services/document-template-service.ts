import "server-only";

import type {
  DocumentTemplateSummary,
  DocumentTemplateVersionSummary,
} from "@/features/forms/types/document-templates";
import {
  sanitizePdfDownloadFilename,
  validatePdfMasterBytes,
} from "@/features/forms/services/pdf-master-validation.mjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RpcResult = { data: unknown; error: { message: string } | null };

async function rpc(name: string, args: Record<string, unknown> = {}): Promise<RpcResult> {
  const client = await createClient();
  return (client as unknown as {
    rpc: (functionName: string, parameters: Record<string, unknown>) => Promise<RpcResult>;
  }).rpc(name, args);
}

function requireData<T>(result: RpcResult): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

export async function listDocumentTemplates(): Promise<DocumentTemplateSummary[]> {
  const rows = requireData<Record<string, unknown>[]>(await rpc("list_document_templates")) ?? [];
  return rows.map((row) => ({
    templateId: String(row.template_id),
    name: String(row.name),
    description: row.description ? String(row.description) : null,
    documentKind: row.document_kind as DocumentTemplateSummary["documentKind"],
    status: row.status as DocumentTemplateSummary["status"],
    versionCount: Number(row.version_count),
    latestVersionNumber: row.latest_version_number == null ? null : Number(row.latest_version_number),
  }));
}

export async function listDocumentTemplateVersions(templateId: string): Promise<DocumentTemplateVersionSummary[]> {
  const rows = requireData<Record<string, unknown>[]>(
    await rpc("list_document_template_versions", { p_template_id: templateId }),
  ) ?? [];
  return rows.map((row) => ({
    versionId: String(row.version_id),
    versionNumber: Number(row.version_number),
    status: row.status as DocumentTemplateVersionSummary["status"],
    validityPolicy: row.validity_policy as DocumentTemplateVersionSummary["validityPolicy"],
    validFor: row.valid_for ? String(row.valid_for) : null,
    explicitExpiresOn: row.explicit_expires_on ? String(row.explicit_expires_on) : null,
    effectiveFrom: row.effective_from ? String(row.effective_from) : null,
    effectiveTo: row.effective_to ? String(row.effective_to) : null,
    hasMaster: Boolean(row.has_master),
    originalFileName: row.original_file_name ? String(row.original_file_name) : null,
    fileSizeBytes: row.file_size_bytes == null ? null : Number(row.file_size_bytes),
    publishedAt: row.published_at ? String(row.published_at) : null,
  }));
}

export async function createDocumentTemplate(input: {
  name: string; description: string; documentKind: string;
}): Promise<string> {
  return String(requireData(await rpc("create_document_template", {
    p_name: input.name,
    p_description: input.description || null,
    p_document_kind: input.documentKind,
  })));
}

type VersionDraftInput = {
  templateId: string; versionId: string; validityPolicy: string; validFor: string;
  explicitExpiresOn: string; effectiveFrom: string; effectiveTo: string;
};

function versionParameters(input: VersionDraftInput): Record<string, unknown> {
  return {
    p_validity_policy: input.validityPolicy,
    p_valid_for: input.validityPolicy === "fixed_interval" ? input.validFor : null,
    p_explicit_expires_on: input.validityPolicy === "explicit_expiration" ? input.explicitExpiresOn : null,
    p_effective_from: input.effectiveFrom || null,
    p_effective_to: input.effectiveTo || null,
  };
}

export async function saveDocumentTemplateVersion(input: VersionDraftInput): Promise<string> {
  if (input.versionId) {
    requireData(await rpc("update_document_template_version_draft", {
      p_version_id: input.versionId,
      ...versionParameters(input),
    }));
    return input.versionId;
  }
  return String(requireData(await rpc("create_document_template_version", {
    p_template_id: input.templateId,
    ...versionParameters(input),
  })));
}

export async function prepareBlankMasterUpload(versionId: string) {
  const objectId = crypto.randomUUID();
  const authorization = requireData<{ bucket: string; objectPath: string }>(
    await rpc("prepare_document_template_master_upload", {
      p_version_id: versionId,
      p_object_id: objectId,
    }),
  );
  const client = await createClient();
  const signed = await client.storage.from(authorization.bucket)
    .createSignedUploadUrl(authorization.objectPath);
  if (signed.error) throw new Error(signed.error.message);
  return { ...authorization, token: signed.data.token };
}

export async function finalizeBlankMasterUpload(
  versionId: string,
  originalFileName: string,
): Promise<void> {
  const authorization = requireData<{
    bucket: string;
    objectPath: string;
    actorProfileId: string;
  }>(await rpc("authorize_document_template_master_finalization", {
    p_version_id: versionId,
  }));

  const trustedStorage = createAdminClient();
  const downloaded = await trustedStorage.storage
    .from(authorization.bucket)
    .download(authorization.objectPath);
  if (downloaded.error) throw new Error(downloaded.error.message);

  const verified = validatePdfMasterBytes(
    new Uint8Array(await downloaded.data.arrayBuffer()),
  );
  const downloadFilename = sanitizePdfDownloadFilename(originalFileName);
  const result = await (trustedStorage as unknown as {
    rpc: (functionName: string, parameters: Record<string, unknown>) => Promise<RpcResult>;
  }).rpc("finalize_document_template_master_upload", {
    p_version_id: versionId,
    p_actor_profile_id: authorization.actorProfileId,
    p_original_file_name: downloadFilename,
    p_content_type: verified.contentType,
    p_file_size_bytes: verified.fileSizeBytes,
    p_checksum_sha256: verified.checksumSha256,
  });
  requireData(result);
}

export async function publishDocumentTemplateVersion(versionId: string): Promise<void> {
  requireData(await rpc("publish_document_template_version", { p_version_id: versionId }));
}

export async function retireDocumentTemplateVersion(versionId: string): Promise<void> {
  requireData(await rpc("retire_document_template_version", { p_version_id: versionId }));
}

export async function archiveDocumentTemplate(templateId: string): Promise<void> {
  requireData(await rpc("archive_document_template", { p_template_id: templateId }));
}

export async function getBlankMasterDownload(versionId: string): Promise<string> {
  const authorization = requireData<{ bucket: string; objectPath: string; fileName: string }>(
    await rpc("authorize_document_template_master_download", { p_version_id: versionId }),
  );
  const trustedStorage = createAdminClient();
  const signed = await trustedStorage.storage.from(authorization.bucket)
    .createSignedUrl(authorization.objectPath, 60, { download: authorization.fileName });
  if (signed.error) throw new Error(signed.error.message);
  return signed.data.signedUrl;
}
