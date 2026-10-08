import { z } from "zod";

const optionalEmail = z.string().trim().email().optional();

export function resolveCommunicationsEmailEnvironment(environment) {
  const mode = environment.COMMUNICATIONS_EMAIL_MODE?.trim().toLowerCase() === "live"
    ? "live"
    : "synthetic";
  const apiKey = environment.RESEND_API_KEY?.trim() || null;
  const fromEmailResult = optionalEmail.safeParse(
    environment.COMMUNICATIONS_FROM_EMAIL?.trim() || undefined,
  );
  const replyToResult = optionalEmail.safeParse(
    environment.COMMUNICATIONS_REPLY_TO_EMAIL?.trim() || undefined,
  );
  const allowlist = [...new Set(
    (environment.COMMUNICATIONS_EMAIL_ALLOWLIST ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter((value) => z.string().email().safeParse(value).success),
  )];
  const fromName = (environment.COMMUNICATIONS_FROM_NAME?.trim()
    || "Youth Ministries").replace(/[<>\r\n]/g, "").slice(0, 100);

  let disabledReason = null;
  if (mode === "live" && !apiKey) disabledReason = "Resend API key is not configured.";
  else if (mode === "live" && !fromEmailResult.success) {
    disabledReason = "A valid communications sender email is not configured.";
  } else if (mode === "live" && !replyToResult.success) {
    disabledReason = "The communications reply-to email is invalid.";
  } else if (mode === "live" && allowlist.length === 0) {
    disabledReason = "The live-email beta allowlist is empty.";
  }

  return Object.freeze({
    mode,
    liveEnabled: mode === "live" && disabledReason === null,
    disabledReason,
    apiKey,
    fromEmail: fromEmailResult.success ? fromEmailResult.data ?? null : null,
    fromName,
    replyToEmail: replyToResult.success ? replyToResult.data ?? null : null,
    allowlist: Object.freeze(allowlist),
  });
}
