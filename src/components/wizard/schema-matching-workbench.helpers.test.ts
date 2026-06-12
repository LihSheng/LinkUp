import { describe, expect, it } from "vitest";

import {
  classifyConfidence,
  getConfidenceLabel,
  getProcessingLabel,
  getRemainingSeconds,
} from "./schema-matching-workbench.helpers";

describe("schema-matching-workbench helpers", () => {
  it("uses user-friendly progress copy for each workbench state", () => {
    expect(getProcessingLabel("analyzing")).toBe("Analyzing uploaded file...");
    expect(getProcessingLabel("confidence-updating")).toBe(
      "Some fields need deeper analysis. Enhancing with AI...",
    );
    expect(getProcessingLabel("validation-running")).toBe(
      "Comparing with template and checking confidence...",
    );
    expect(getProcessingLabel("ready-for-review")).toBe(
      "AI matching completed. Please review the result.",
    );
    expect(getProcessingLabel("failed")).toBe("AI matching could not complete.");
  });

  it("classifies confidence into the review bands used by the UI", () => {
    expect(classifyConfidence(98)).toBe("matched");
    expect(classifyConfidence(85)).toBe("matched");
    expect(classifyConfidence(84)).toBe("review-needed");
    expect(classifyConfidence(60)).toBe("review-needed");
    expect(classifyConfidence(59)).toBe("unmatched");
  });

  it("returns the user-facing label for each confidence band", () => {
    expect(getConfidenceLabel("matched")).toBe("Matched");
    expect(getConfidenceLabel("review-needed")).toBe("Review Needed");
    expect(getConfidenceLabel("unmatched")).toBe("Unmatched");
  });

  it("keeps the remaining time estimate positive", () => {
    expect(getRemainingSeconds(0)).toBe(18);
    expect(getRemainingSeconds(17)).toBe(1);
    expect(getRemainingSeconds(99)).toBe(1);
  });
});

