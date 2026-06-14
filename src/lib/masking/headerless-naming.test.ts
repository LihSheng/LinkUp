import { describe, it, expect } from "vitest";
import {
  columnIndexToLabel,
  buildSyntheticColumnNames,
} from "./headerless-naming";

describe("columnIndexToLabel", () => {
  it("returns Column A for index 0", () => {
    expect(columnIndexToLabel(0)).toBe("Column A");
  });

  it("returns Column B for index 1", () => {
    expect(columnIndexToLabel(1)).toBe("Column B");
  });

  it("returns Column Z for index 25", () => {
    expect(columnIndexToLabel(25)).toBe("Column Z");
  });

  it("returns Column AA for index 26", () => {
    expect(columnIndexToLabel(26)).toBe("Column AA");
  });

  it("returns Column AB for index 27", () => {
    expect(columnIndexToLabel(27)).toBe("Column AB");
  });

  it("returns Column BA for index 52", () => {
    expect(columnIndexToLabel(52)).toBe("Column BA");
  });
});

describe("buildSyntheticColumnNames", () => {
  it("generates correct number of names", () => {
    const names = buildSyntheticColumnNames(3);
    expect(names).toEqual(["Column A", "Column B", "Column C"]);
  });

  it("handles 26+ columns", () => {
    const names = buildSyntheticColumnNames(28);
    expect(names[25]).toBe("Column Z");
    expect(names[26]).toBe("Column AA");
    expect(names[27]).toBe("Column AB");
  });

  it("returns empty array for 0", () => {
    expect(buildSyntheticColumnNames(0)).toEqual([]);
  });
});
