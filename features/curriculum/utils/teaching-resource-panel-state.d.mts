export type TeachingResourcePanel = "link" | "upload" | null;

export function nextTeachingResourcePanel(
  currentPanel: TeachingResourcePanel,
  requestedPanel: TeachingResourcePanel,
): TeachingResourcePanel;
