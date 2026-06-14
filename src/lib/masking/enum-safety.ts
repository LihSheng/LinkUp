const SAFE_ENUM_PATTERNS: RegExp[] = [
  /^(active|inactive)$/i,
  /^(full.?time|part.?time)$/i,
  /^(male|female|other)$/i,
  /^(single|married|divorced|widowed)$/i,
  /^(yes|no|n\/a)$/i,
  /^(true|false)$/i,
  /^(low|medium|high)$/i,
  /^(beginner|intermediate|advanced)$/i,
  /^(pending|approved|rejected|under.?review)$/i,
  /^(draft|published|archived|scheduled)$/i,
  /^(hourly|monthly|yearly|weekly|daily)$/i,
  /^(permanent|contract|temporary|intern)$/i,
  /^(entry.?level|mid.?level|senior|lead|manager|director|executive)$/i,
  /^(new|existing|lapsed|cancelled)$/i,
  /^(internal|external|both)$/i,
  /^(primary|secondary|tertiary)$/i,
  /^(enabled|disabled)$/i,
  /^(yes|no|maybe|unknown)$/i,
];

export const UNSAFE_ENUM_KEYWORDS = [
  "salary", "pay", "bonus", "commission",
  "terminat", "fired", "dismissed",
  "disciplinary", "warning",
  "sick", "medical", "diagnosis", "health",
  "bank", "account", "loan", "credit", "debt",
  "complaint", "grievance",
  "password", "secret", "classified",
];

export function isSafeEnumValue(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 60) return false;

  if (SAFE_ENUM_PATTERNS.some((p) => p.test(trimmed))) return true;
  if (UNSAFE_ENUM_KEYWORDS.some((k) => trimmed.toLowerCase().includes(k))) return false;

  if (/^[a-zA-Z][a-zA-Z0-9_\- ]*$/.test(trimmed) && trimmed.length <= 40) return true;

  return false;
}

export function classifyEnumValues(values: string[]): { safe: boolean; maskedSamples: string[] } {
  const validValues = values.filter((v): v is string => v != null);
  const unique = [...new Set(validValues.map((v) => v.trim()).filter(Boolean))];
  if (unique.length === 0) return { safe: true, maskedSamples: ["<EMPTY>"] };

  const hasUnsafe = unique.some((v) => !isSafeEnumValue(v));
  if (hasUnsafe) {
    return { safe: false, maskedSamples: ["<SENSITIVE_ENUM>"] };
  }

  return { safe: true, maskedSamples: unique.slice(0, 3) };
}

export function isEnumColumn(values: string[], uniqueCount: number, totalCount: number): boolean {
  if (totalCount < 3 || uniqueCount < 2) return false;
  const ratio = uniqueCount / totalCount;
  return ratio <= 0.7 && uniqueCount <= 20;
}
