export function getParticipationOverrideState(requirements) {
  const blocking = requirements.filter(
    (item) => !item.ready && item.blocksParticipation,
  );
  const hasUnconfiguredBlocker = blocking.some(
    (item) => item.configured === false ||
      typeof item.requirementId !== "string",
  );

  return {
    eligible: blocking.length > 0 && !hasUnconfiguredBlocker,
    hasUnconfiguredBlocker,
    requirementIds: hasUnconfiguredBlocker
      ? []
      : blocking.map((item) => item.requirementId),
  };
}

export function describeReadinessRequirement(requirement) {
  if (requirement.configured === false && requirement.requirementId === null) {
    return "Medical Form requirement is not configured for this school year.";
  }

  return `${requirement.templateName}: ${requirement.missing
    .join(", ")
    .replaceAll("_", " ")}`;
}
