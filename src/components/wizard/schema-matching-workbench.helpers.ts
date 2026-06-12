export type WorkbenchState =
  | "analyzing"
  | "confidence-updating"
  | "validation-running"
  | "ready-for-review"
  | "failed";

export type ConfidenceBand = "matched" | "review-needed" | "unmatched";

export function getProcessingLabel(state: WorkbenchState): string {
  switch (state) {
    case "analyzing":
      return "Analyzing uploaded file...";
    case "confidence-updating":
      return "Some fields need deeper analysis. Enhancing with AI...";
    case "validation-running":
      return "Comparing with template and checking confidence...";
    case "ready-for-review":
      return "AI matching completed. Please review the result.";
    case "failed":
      return "AI matching could not complete.";
  }
}

export function classifyConfidence(confidence: number): ConfidenceBand {
  if (confidence >= 85) {
    return "matched";
  }

  if (confidence >= 60) {
    return "review-needed";
  }

  return "unmatched";
}

export function getConfidenceLabel(band: ConfidenceBand): string {
  switch (band) {
    case "matched":
      return "Matched";
    case "review-needed":
      return "Review Needed";
    case "unmatched":
      return "Unmatched";
  }
}

export function getRemainingSeconds(elapsedSeconds: number, totalSeconds = 18): number {
  return Math.max(1, totalSeconds - elapsedSeconds);
}

