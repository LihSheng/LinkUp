import { describe, it, expect } from "vitest";
import { maskWorkbookProfiles, capHeaderlessConfidence } from "./masking.service";
import type { ColumnProfile, FieldMapping } from "@/lib/mapping/mapping.types";

describe("maskWorkbookProfiles valueCategories", () => {
  it("stores valueCategories in audit summary that survive JSON roundtrip", () => {
    const profiles: ColumnProfile[] = [
      { name: "Email", index: 0, detectedType: "string", samples: ["a@b.com"], nullRate: 0, uniqueCount: 1 },
      { name: "Salary", index: 1, detectedType: "string", samples: ["$5,000"], nullRate: 0, uniqueCount: 1 },
      { name: "Name", index: 2, detectedType: "string", samples: ["John"], nullRate: 0, uniqueCount: 1 },
    ];
    const result = maskWorkbookProfiles({
      profiles,
      sampleRows: [],
      sourceMode: "headerless",
      includeRowPatterns: false,
      provider: "lmstudio",
    });

    const auditJson = JSON.parse(JSON.stringify(result.auditSummary));

    expect(auditJson.sourceMode).toBe("headerless");
    expect(auditJson.provider).toBe("lmstudio");
    expect(auditJson.maskedColumnProfilesSent).toBe(true);
    expect(auditJson.maskedRowPatternsSent).toBe(false);
    expect(auditJson.maskedRowPatternCount).toBe(0);
    expect(auditJson.timestamp).toBeDefined();
    expect(auditJson.valueCategories).toBeDefined();
    expect(auditJson.valueCategories.Email).toBe("email");
    expect(auditJson.valueCategories.Salary).toBe("currency");
    expect(auditJson.valueCategories.Name).toBe("person_name");
  });

  it("returns valueCategories as a Map keyed by column name", () => {
    const profiles: ColumnProfile[] = [
      { name: "Email", index: 0, detectedType: "string", samples: ["a@b.com"], nullRate: 0, uniqueCount: 1 },
      { name: "Phone", index: 1, detectedType: "string", samples: ["+65 9123 4567"], nullRate: 0, uniqueCount: 1 },
    ];
    const result = maskWorkbookProfiles({
      profiles,
      sampleRows: [],
      sourceMode: "headerless",
      includeRowPatterns: false,
    });

    expect(result.valueCategories.get("Email")).toBe("email");
    expect(result.valueCategories.get("Phone")).toBe("phone");
  });

  it("includes maskedRowPatterns when includeRowPatterns is true", () => {
    const profiles: ColumnProfile[] = [
      { name: "Column A", index: 0, detectedType: "string", samples: ["John"], nullRate: 0, uniqueCount: 1 },
    ];
    const result = maskWorkbookProfiles({
      profiles,
      sampleRows: [{ "Column A": "John Doe" }],
      sourceMode: "headerless",
      includeRowPatterns: true,
    });

    expect(result.maskedRowPatterns).toHaveLength(1);
    expect(result.auditSummary.maskedRowPatternsSent).toBe(true);
    expect(result.auditSummary.maskedRowPatternCount).toBe(1);
  });
});

describe("capHeaderlessConfidence", () => {
  it("caps confidence based on stored value categories", () => {
    const mappings: FieldMapping[] = [
      { targetPath: "email", sourceColumn: "Column A", confidence: 0.95, transform: "none", reason: "" },
      { targetPath: "salary", sourceColumn: "Column B", confidence: 0.95, transform: "none", reason: "" },
      { targetPath: "name", sourceColumn: "Column C", confidence: 0.95, transform: "none", reason: "" },
    ];
    const valueCategories = new Map([
      ["Column A", "email" as const],
      ["Column B", "currency" as const],
      ["Column C", "person_name" as const],
    ]);

    const capped = capHeaderlessConfidence(mappings, valueCategories, ["Column A", "Column B", "Column C"]);

    expect(capped[0].confidence).toBe(0.85); // email cap
    expect(capped[1].confidence).toBe(0.70); // currency cap
    expect(capped[2].confidence).toBe(0.65); // person_name cap
  });

  it("does not cap headered columns", () => {
    const mappings: FieldMapping[] = [
      { targetPath: "email", sourceColumn: "Email", confidence: 0.95, transform: "none", reason: "" },
    ];
    const valueCategories = new Map([["Email", "email" as const]]);
    const capped = capHeaderlessConfidence(mappings, valueCategories, ["Email"]);

    expect(capped[0].confidence).toBe(0.95);
  });

  it("falls back to unknown cap when category is missing", () => {
    const mappings: FieldMapping[] = [
      { targetPath: "unknown", sourceColumn: "Column A", confidence: 0.95, transform: "none", reason: "" },
    ];
    const valueCategories = new Map<string, "email">();
    const capped = capHeaderlessConfidence(mappings, valueCategories, ["Column A"]);

    expect(capped[0].confidence).toBe(0.50);
  });
});
