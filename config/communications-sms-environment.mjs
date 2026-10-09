import { parsePhoneNumberFromString } from "libphonenumber-js";

const value = (input) => typeof input === "string" ? input.trim() : "";

export function normalizeSmsPhoneNumber(input) {
  const candidate = value(input);
  if (!candidate) return null;

  const parsed = parsePhoneNumberFromString(candidate, "US");
  return parsed?.isValid() ? parsed.number : null;
}

export function resolveCommunicationsSmsEnvironment(environment) {
  const mode = environment.COMMUNICATIONS_SMS_MODE === "live"
    ? "live"
    : "synthetic";
  const accountSid = value(environment.TWILIO_ACCOUNT_SID) || null;
  const authToken = value(environment.TWILIO_AUTH_TOKEN) || null;
  const fromPhoneNumber = normalizeSmsPhoneNumber(
    environment.TWILIO_FROM_PHONE_NUMBER,
  );
  const rawMessagingServiceSid = value(
    environment.TWILIO_MESSAGING_SERVICE_SID,
  );
  const messagingServiceSid = /^MG[a-fA-F0-9]{32}$/.test(rawMessagingServiceSid)
    ? rawMessagingServiceSid
    : null;
  const allowlist = [...new Set(
    value(environment.COMMUNICATIONS_SMS_ALLOWLIST)
      .split(",")
      .map(normalizeSmsPhoneNumber)
      .filter(Boolean),
  )];

  let disabledReason = null;
  if (mode !== "live") {
    disabledReason = "Live SMS is not enabled.";
  } else if (!/^AC[a-fA-F0-9]{32}$/.test(accountSid ?? "") || !authToken) {
    disabledReason = "Live SMS credentials are incomplete.";
  } else if (!fromPhoneNumber && !messagingServiceSid) {
    disabledReason = "A live SMS sending identity is required.";
  } else if (allowlist.length === 0) {
    disabledReason = "No live SMS recipients are enabled.";
  }

  return Object.freeze({
    mode,
    liveEnabled: disabledReason === null,
    disabledReason,
    accountSid,
    authToken,
    fromPhoneNumber,
    messagingServiceSid,
    allowlist: Object.freeze(allowlist),
  });
}
