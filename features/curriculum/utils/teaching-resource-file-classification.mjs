const supportedFiles = {
  pdf: { contentType: "application/pdf", resourceType: "pdf", label: "PDF" },
  docx: {
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    resourceType: "document",
    label: "Word document",
  },
  pptx: {
    contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    resourceType: "document",
    label: "PowerPoint presentation",
  },
  txt: { contentType: "text/plain", resourceType: "document", label: "Text document" },
  mp4: { contentType: "video/mp4", resourceType: "video", label: "MP4 video" },
};

export function classifyTeachingResourceFile(fileName, contentType) {
  const extension = fileName.trim().toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  if (!extension || !(extension in supportedFiles)) return null;
  const classification = supportedFiles[extension];
  if (classification.contentType !== contentType) return null;
  return { ...classification, extension };
}
