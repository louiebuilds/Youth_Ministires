import type { DocumentRequirementReadiness } from "@/features/events/types/event-management";

export function getParticipationOverrideState(
  requirements: DocumentRequirementReadiness[],
): {
  eligible: boolean;
  hasUnconfiguredBlocker: boolean;
  requirementIds: string[];
};

export function describeReadinessRequirement(
  requirement: DocumentRequirementReadiness,
): string;
