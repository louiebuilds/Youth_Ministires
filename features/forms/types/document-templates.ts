export type DocumentTemplateActionState = {
  success: boolean;
  message?: string;
};

export type DocumentTemplateSummary = {
  templateId: string;
  name: string;
  description: string | null;
  documentKind: "permission_slip" | "medical_release";
  status: "draft" | "active" | "archived";
  versionCount: number;
  latestVersionNumber: number | null;
};

export type DocumentTemplateVersionSummary = {
  versionId: string;
  versionNumber: number;
  status: "draft" | "published" | "retired";
  validityPolicy:
    | "event_specific"
    | "fixed_interval"
    | "explicit_expiration";
  validFor: string | null;
  explicitExpiresOn: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  hasMaster: boolean;
  originalFileName: string | null;
  fileSizeBytes: number | null;
  publishedAt: string | null;
};
