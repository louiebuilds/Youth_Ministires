export async function submitOutboundEmail(provider, message, authorization) {
  const destination = typeof message.to === "string"
    ? message.to.trim().toLowerCase()
    : "";

  const restrictedAllowed =
    authorization?.policy === "restricted"
    && Array.isArray(authorization.allowedRecipients)
    && authorization.allowedRecipients.includes(destination);

  const ministryAllowed =
    authorization?.policy === "ministry"
    && typeof authorization.approvedRecipient === "string"
    && authorization.approvedRecipient.trim().toLowerCase() === destination;

  if (!destination || !(restrictedAllowed || ministryAllowed)) {
    return {
      success: false,
      provider: provider.name,
      classification: "configuration",
      message: "Recipient no longer allowed by the email delivery policy.",
    };
  }

  return provider.send(message);
}
