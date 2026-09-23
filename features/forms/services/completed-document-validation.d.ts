export function inspectCompletedDocument(bytes: Uint8Array): {
  contentType: "application/pdf" | "image/jpeg" | "image/png";
  extension: "pdf" | "jpg" | "png";
  fileSizeBytes: number;
  checksumSha256: string;
};
export function sanitizeCompletedDocumentFilename(rawFilename: string, extension: "pdf"|"jpg"|"png"): string;
