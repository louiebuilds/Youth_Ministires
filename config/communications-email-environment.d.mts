import type { CommunicationsEmailEnvironment } from "./env";

export function resolveCommunicationsEmailEnvironment(
  environment: Record<string, string | undefined>,
): CommunicationsEmailEnvironment;
