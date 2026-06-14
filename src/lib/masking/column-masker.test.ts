import { describe, it, expect } from "vitest";
import { buildMaskedColumnProfiles } from "./column-masker";
import type { ColumnProfile } from "@/lib/mapping/mapping.types";

describe("buildMaskedColumnProfiles", () => {
  it("masks email samples in a column", () => {
    const profiles: ColumnProfile[] = [
      {
        name: "Email",
        index: 0,
        detectedType: "string",
        samples: ["john@test.com", "jane@test.com", "bob@test.com"],
        nullRate: 0,
        uniqueCount: 3,
      },
    ];
    const results = buildMaskedColumnProfiles(profiles);
    expect(results[0].valueCategory).toBe("email");
    expect(results[0].profile.samples).toEqual(["<EMAIL>"]);
  });

  it("masks phone samples in a column", () => {
    const profiles: ColumnProfile[] = [
      {
        name: "Phone",
        index: 0,
        detectedType: "string",
        samples: ["+65 9123 4567", "012-345 6789"],
        nullRate: 0,
        uniqueCount: 2,
      },
    ];
    const results = buildMaskedColumnProfiles(profiles);
    expect(results[0].valueCategory).toBe("phone");
    expect(results[0].profile.samples).toEqual(["<PHONE>"]);
  });

  it("masks government IDs", () => {
    const profiles: ColumnProfile[] = [
      {
        name: "NRIC",
        index: 0,
        detectedType: "string",
        samples: ["S1234567A", "T1234567Z"],
        nullRate: 0,
        uniqueCount: 2,
      },
    ];
    const results = buildMaskedColumnProfiles(profiles);
    expect(results[0].valueCategory).toBe("government_id");
  });

  it("masks dates to DATE token", () => {
    const profiles: ColumnProfile[] = [
      {
        name: "Start Date",
        index: 0,
        detectedType: "date",
        samples: ["2024-01-15", "2024-03-20"],
        nullRate: 0,
        uniqueCount: 2,
      },
    ];
    const results = buildMaskedColumnProfiles(profiles);
    expect(results[0].valueCategory).toBe("date");
  });

  it("masks currency amounts", () => {
    const profiles: ColumnProfile[] = [
      {
        name: "Salary",
        index: 0,
        detectedType: "string",
        samples: ["$4,500", "$5,200"],
        nullRate: 0,
        uniqueCount: 2,
      },
    ];
    const results = buildMaskedColumnProfiles(profiles);
    expect(results[0].valueCategory).toBe("currency");
  });

  it("handles enum columns safely", () => {
    const profiles: ColumnProfile[] = [
      {
        name: "Status",
        index: 0,
        detectedType: "string",
        samples: ["Active", "Inactive", "Active", "Inactive"],
        nullRate: 0,
        uniqueCount: 2,
      },
    ];
    const results = buildMaskedColumnProfiles(profiles);
    expect(results[0].valueCategory).toBe("enum_safe");
  });

  it("masks unsafe enum columns", () => {
    const profiles: ColumnProfile[] = [
      {
        name: "Medical Status",
        index: 0,
        detectedType: "string",
        samples: ["Medical Leave", "Sick", "Medical Leave", "Sick", "Annual"],
        nullRate: 0,
        uniqueCount: 3,
      },
    ];
    const results = buildMaskedColumnProfiles(profiles);
    expect(results[0].valueCategory).toBe("enum_unsafe");
    expect(results[0].profile.samples).toEqual(["<SENSITIVE_ENUM>"]);
  });

  it("caps samples and deduplicates", () => {
    const profiles: ColumnProfile[] = [
      {
        name: "Mixed",
        index: 0,
        detectedType: "string",
        samples: ["value1", "value2", "value3", "value4", "value5"],
        nullRate: 0,
        uniqueCount: 5,
      },
    ];
    const results = buildMaskedColumnProfiles(profiles);
    expect(results[0].profile.samples.length).toBeLessThanOrEqual(3);
  });

  it("preserves nullRate and name", () => {
    const profiles: ColumnProfile[] = [
      {
        name: "Email",
        index: 0,
        detectedType: "string",
        samples: ["a@b.com"],
        nullRate: 0.5,
        uniqueCount: 1,
      },
    ];
    const results = buildMaskedColumnProfiles(profiles);
    expect(results[0].profile.name).toBe("Email");
    expect(results[0].profile.nullRate).toBe(0.5);
  });
});
