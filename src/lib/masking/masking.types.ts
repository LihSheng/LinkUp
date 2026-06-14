export type MaskedValueCategory =
  | "email"
  | "phone"
  | "government_id"
  | "date"
  | "number"
  | "currency"
  | "person_name"
  | "free_text"
  | "code"
  | "enum_safe"
  | "enum_unsafe"
  | "boolean"
  | "empty"
  | "unknown";

export type SourceMode = "headered" | "headerless";

export type HeaderResolution = {
  action: "use_first_row" | "headerless" | "choose_template";
  userSelected: boolean;
};

export type MaskingAuditSummary = {
  sourceMode: SourceMode;
  headerResolution?: HeaderResolution;
  maskedColumnProfilesSent: boolean;
  maskedRowPatternsSent: boolean;
  maskedRowPatternCount: number;
  valueCategories: Record<string, string>;
  provider: string;
  timestamp: string;
};

export const HEADERLESS_CONFIDENCE_CAPS: Record<string, number> = {
  email: 0.85,
  phone: 0.85,
  government_id: 0.85,
  date: 0.70,
  number: 0.70,
  currency: 0.70,
  enum_safe: 0.75,
  enum_unsafe: 0.60,
  person_name: 0.65,
  free_text: 0.50,
  code: 0.70,
  boolean: 0.85,
  empty: 0,
  unknown: 0.50,
};

export function getHeaderlessConfidenceCap(category: MaskedValueCategory): number {
  return HEADERLESS_CONFIDENCE_CAPS[category] ?? 0.50;
}
