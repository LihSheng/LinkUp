export type DetectedType =
  | "string"
  | "number"
  | "date"
  | "boolean"
  | "mixed"
  | "empty";

export type TransformRule =
  | "none"
  | "trim"
  | "to_number"
  | "parse_date"
  | "uppercase"
  | "lowercase";

export type ColumnProfile = {
  name: string;
  index: number;
  detectedType: DetectedType;
  samples: unknown[];
  nullRate: number;
  uniqueCount?: number;
};

export type MaskedRowPattern = {
  rowNumber: number;
  values: Record<string, string>;
};

export type SchemaMatchInput = {
  targetJsonSchema: unknown;
  sourceSheetName: string;
  sourceColumns: ColumnProfile[];
  sampleRows: Record<string, unknown>[];
  maskedRowPatterns?: MaskedRowPattern[];
  sourceMode?: "headered" | "headerless";
};

export type FieldMapping = {
  targetPath: string;
  sourceColumn: string | null;
  confidence: number;
  transform?: TransformRule;
  reason?: string;
  constantValue?: string | null;
};

export type SchemaMatchResult = {
  mappings: FieldMapping[];
  warnings: string[];
};

export type TargetField = {
  path: string;
  type: string;
  required: boolean;
  description?: string;
};
