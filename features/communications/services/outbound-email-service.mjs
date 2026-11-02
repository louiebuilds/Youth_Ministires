export async function submitOutboundEmail(provider, message, allowedRecipients, deliveryPolicy = "restricted") {
  const destination = typeof message.to === "string" ? message.to.trim().toLowerCase() : "";
  if (!destination || !["restricted", "ministry"].includes(deliveryPolicy)
      || (deliveryPolicy === "restricted" && (!Array.isArray(allowedRecipients) || !allowedRecipients.includes(destination)))) {
    return {
      success: false,
      provider: provider.name,
      classification: "configuration",
      message: "Recipient no longer allowed by the email delivery policy.",
    };
  }
  return provider.send(message);
}
