export function validatePdfMasterBytes(bytes: Uint8Array): {
  contentType: "application/pdf";
  fileSizeBytes: number;
  checksumSha256: string;
};
export function sanitizePdfDownloadFilename(rawFilename: string): string;
