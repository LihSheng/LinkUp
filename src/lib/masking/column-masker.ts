import { classifyCellValue } from "@/lib/masking/cell-masker";
import { isEnumColumn, classifyEnumValues } from "@/lib/masking/enum-safety";
import type { ColumnProfile } from "@/lib/mapping/mapping.types";
import type { MaskedValueCategory, SourceMode } from "@/lib/masking/masking.types";

export type MaskedColumnResult = {
  profile: ColumnProfile;
  valueCategory: MaskedValueCategory;
};

function inferColumnCategory(values: unknown[], types: MaskedValueCategory[]): MaskedValueCategory {
  const nonEmpty = types.filter((t) => t !== "empty");
  if (nonEmpty.length === 0) return "empty";

  const counts = new Map<MaskedValueCategory, number>();
  for (const t of nonEmpty) {
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }

  let best: MaskedValueCategory = "unknown";
  let bestCount = 0;
  for (const [cat, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      best = cat;
    }
  }

  if (bestCount / nonEmpty.length >= 0.5) return best;
  return "unknown";
}

export function buildMaskedColumnProfiles(
  profiles: ColumnProfile[],
  options?: { sourceMode?: SourceMode },
): MaskedColumnResult[] {
  return profiles.map((profile) => {
    const rawSamples = profile.samples;
    const classifications = rawSamples.map((s) => classifyCellValue(s));
    const nonEmptyClassifications = classifications.filter((c) => c.category !== "empty");

    const stringValues = rawSamples
      .filter((s) => s !== null && s !== undefined && s !== "")
      .map(String);

    let maskedSamples: string[];
    let valueCategory: MaskedValueCategory;

    const uniqueCount = new Set(stringValues).size;
    const enumLike = isEnumColumn(stringValues, uniqueCount, stringValues.length);

    if (enumLike) {
      const { safe, maskedSamples: enumSamples } = classifyEnumValues(stringValues);
      valueCategory = safe ? "enum_safe" : "enum_unsafe";
      maskedSamples = enumSamples;
      return {
        profile: {
          ...profile,
          samples: maskedSamples,
        },
        valueCategory,
      };
    }

    valueCategory = inferColumnCategory(rawSamples, classifications.map((c) => c.category));
    const rawMasked = classifications.map((c) => c.masked);
    maskedSamples = [...new Set(rawMasked)].filter((v) => v !== "<EMPTY>").slice(0, 3);
    if (maskedSamples.length === 0) {
      maskedSamples = ["<VALUE>"];
    }

    return {
      profile: {
        ...profile,
        samples: maskedSamples,
      },
      valueCategory,
    };
  });
}
