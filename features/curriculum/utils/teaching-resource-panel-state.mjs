export function nextTeachingResourcePanel(currentPanel, requestedPanel) {
  if (requestedPanel === null || currentPanel === requestedPanel) return null;
  return requestedPanel;
}
