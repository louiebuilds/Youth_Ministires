export function normalizeSmsPhoneNumber(value: unknown): string | null;

export function resolveCommunicationsSmsEnvironment(
  environment: Record<string, string | undefined>,
): {
  readonly mode: "synthetic" | "live";
  readonly liveEnabled: boolean;
  readonly disabledReason: string | null;
  readonly accountSid: string | null;
  readonly authToken: string | null;
  readonly fromPhoneNumber: string | null;
  readonly messagingServiceSid: string | null;
  readonly allowlist: readonly string[];
};
