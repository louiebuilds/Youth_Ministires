import { createHash } from "node:crypto";

const MAXIMUM_BYTES = 20 * 1024 * 1024;
const signatures = [
  { contentType: "application/pdf", extension: "pdf", bytes: [0x25,0x50,0x44,0x46,0x2d] },
  { contentType: "image/jpeg", extension: "jpg", bytes: [0xff,0xd8,0xff] },
  { contentType: "image/png", extension: "png", bytes: [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a] },
];

export function inspectCompletedDocument(bytes) {
  if (bytes.byteLength < 1 || bytes.byteLength > MAXIMUM_BYTES) {
    throw new Error("The completed document must be no larger than 20 MB.");
  }
  const detected = signatures.find((signature) =>
    signature.bytes.every((value, index) => bytes[index] === value));
  if (!detected) throw new Error("The uploaded file is not a valid PDF, JPEG, or PNG.");
  return {
    contentType: detected.contentType,
    extension: detected.extension,
    fileSizeBytes: bytes.byteLength,
    checksumSha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

export function sanitizeCompletedDocumentFilename(rawFilename, extension) {
  const basename=String(rawFilename??"").normalize("NFKC").split(/[\\/]/).at(-1)??"";
  const stem=basename.replace(/[\u0000-\u001f\u007f]/g,"").replace(/\.(pdf|jpe?g|png)\s*$/i,"")
    .replace(/[^A-Za-z0-9 ._()-]+/g,"-").replace(/\s+/g," ").replace(/\.{2,}/g,".")
    .trim().replace(/^[ ._-]+|[ ._-]+$/g,"").slice(0,155).trim();
  return `${stem||"completed-document"}.${extension}`;
}
