export function resolveTemplateApplication({
  templates,
  templateId,
  channel,
  subject,
  messageBody,
  appliedContent,
  allowManualReplacement = false,
}) {
  if (!templateId) {
    return {
      kind: "applied",
      selectedTemplateId: "",
      subject,
      messageBody,
      appliedContent: null,
    };
  }

  const template = templates.find(
    (item) => item.templateId === templateId &&
      item.channel === channel && !item.archivedAt,
  );
  if (!template) return { kind: "invalid" };

  const nextSubject = channel === "email" ? template.subject ?? "" : "";
  const hasManualMessage = messageBody.length > 0 &&
    messageBody !== appliedContent?.messageBody;
  const hasManualSubject = channel === "email" && subject.length > 0 &&
    subject !== appliedContent?.subject;
  if ((hasManualMessage || hasManualSubject) && !allowManualReplacement) {
    return { kind: "confirmation_required" };
  }

  return {
    kind: "applied",
    selectedTemplateId: template.templateId,
    subject: nextSubject,
    messageBody: template.messageBody,
    appliedContent: {
      subject: nextSubject,
      messageBody: template.messageBody,
    },
  };
}
