export const lockedStepHint = (steps, step) => step.lockedHint ||
  `Complete ${steps[steps.findIndex((entry) => entry.key === step.key) - 1]?.label || "the previous step"} to open ${step.label}.`;

export const stepStatusText = (step) => step.locked ? "Locked" : step.needsReview ? "Needs review" :
  step.completed ? "Complete" : "Not complete";

// The viewing position is presentation state. It never changes completion,
// opens a panel, or executes an analysis.
export function viewedStepAt(sections, line, atBottom = false) {
  if (!sections.length) return null;
  if (atBottom) return sections.at(-1).key;
  return sections.filter((section) => section.top <= line + 1).at(-1)?.key || sections[0].key;
}
