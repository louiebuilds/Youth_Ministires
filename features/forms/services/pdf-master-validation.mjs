import { createHash } from "node:crypto";

const MAXIMUM_PDF_BYTES = 15 * 1024 * 1024;
const MAXIMUM_DOWNLOAD_FILENAME_LENGTH = 120;
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d];

export function sanitizePdfDownloadFilename(rawFilename) {
  const basename = String(rawFilename ?? "").normalize("NFKC").split(/[\\/]/).at(-1) ?? "";
  const withoutControls = basename.replace(/[\u0000-\u001f\u007f]/g, "");
  const withoutExtension = withoutControls.replace(/\.pdf\s*$/i, "");
  const safeStem = withoutExtension
    .replace(/[^A-Za-z0-9 ._()-]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/\.{2,}/g, ".")
    .trim()
    .replace(/^[ ._-]+|[ ._-]+$/g, "")
    .slice(0, MAXIMUM_DOWNLOAD_FILENAME_LENGTH - 4)
    .trim();

  return `${safeStem || "blank-form"}.pdf`;
}

export function validatePdfMasterBytes(bytes) {
  if (bytes.byteLength < PDF_SIGNATURE.length || bytes.byteLength > MAXIMUM_PDF_BYTES) {
    throw new Error("The blank master must be a PDF no larger than 15 MB.");
  }
  if (!PDF_SIGNATURE.every((value, index) => bytes[index] === value)) {
    throw new Error("The uploaded file does not contain a valid PDF signature.");
  }
  return {
    contentType: "application/pdf",
    fileSizeBytes: bytes.byteLength,
    checksumSha256: createHash("sha256").update(bytes).digest("hex"),
  };
}
