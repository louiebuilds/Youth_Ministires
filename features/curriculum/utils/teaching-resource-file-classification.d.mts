export type TeachingResourceFileClassification = {
  contentType: "application/pdf" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document" | "application/vnd.openxmlformats-officedocument.presentationml.presentation" | "text/plain" | "video/mp4";
  resourceType: "document" | "pdf" | "video";
  label: string;
  extension: "pdf" | "docx" | "pptx" | "txt" | "mp4";
};

export function classifyTeachingResourceFile(
  fileName: string,
  contentType: string,
): TeachingResourceFileClassification | null;
