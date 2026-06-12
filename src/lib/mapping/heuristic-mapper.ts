import type {
  ColumnProfile,
  FieldMapping,
  SchemaMatchInput,
  SchemaMatchResult,
  TargetField,
  TransformRule,
} from "@/lib/mapping/mapping.types";
import { flattenJsonSchema } from "@/lib/schema/json-schema";
import { logBackendEvent } from "@/lib/logger";

const ABBREVIATIONS: Record<string, string[]> = {
  emp: ["employee"],
  no: ["number", "num"],
  id: ["identifier"],
  dob: ["date_of_birth", "birth", "birthdate"],
  addr: ["address"],
  tel: ["telephone", "phone", "mobile"],
  fname: ["first_name", "firstname"],
  lname: ["last_name", "lastname"],
  sal: ["salary"],
  dept: ["department"],
  desc: ["description"],
  qty: ["quantity"],
  amt: ["amount"],
  mgr: ["manager"],
  org: ["organization", "organisation"],
  bday: ["birthday", "birth_date"],
};

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean);
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  let prev: number[] = [];
  for (let j = 0; j <= n; j++) prev[j] = j;
  let curr: number[] = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] =
        a[i - 1] === b[j - 1]
          ? prev[j - 1]
          : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }
  return prev[n];
}

function areAbbreviationOf(token: string, other: string): boolean {
  const expansions = ABBREVIATIONS[token];
  if (expansions && expansions.includes(other)) return true;
  const reverseExpansions = ABBREVIATIONS[other];
  if (reverseExpansions && reverseExpansions.includes(token)) return true;
  return false;
}

function tokenPairSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  if (areAbbreviationOf(a, b)) return 0.85;

  if (a.length >= 3 && b.length >= 3) {
    if (a.startsWith(b) || b.startsWith(a)) return 0.65;
    if (a.includes(b) || b.includes(a)) return 0.6;
  }

  const maxLen = Math.max(a.length, b.length);
  const dist = levenshtein(a, b);
  const sim = 1 - dist / maxLen;
  return sim >= 0.6 ? sim : 0;
}

function scoreMatch(field: TargetField, column: ColumnProfile): number {
  const fieldTokens = tokenize(field.path);
  const columnTokens = tokenize(column.name);

  if (fieldTokens.length === 0 || columnTokens.length === 0) return 0;

  const fieldTokenSet = new Set(fieldTokens);

  for (const ft of fieldTokens) {
    for (const [abbr, expansions] of Object.entries(ABBREVIATIONS)) {
      if (expansions.includes(ft)) {
        fieldTokenSet.add(abbr);
      }
    }
  }

  let exactMatches = 0;
  let fuzzyMatchCount = 0;
  const matchedFieldTokens = new Set<string>();

  for (const ct of columnTokens) {
    if (fieldTokenSet.has(ct)) {
      exactMatches++;
      matchedFieldTokens.add(ct);
      continue;
    }

    let bestSim = 0;
    let bestFieldToken = "";
    for (const ft of fieldTokens) {
      if (matchedFieldTokens.has(ft)) continue;
      const sim = tokenPairSimilarity(ct, ft);
      if (sim > bestSim) {
        bestSim = sim;
        bestFieldToken = ft;
      }
    }
    if (bestSim >= 0.6) {
      fuzzyMatchCount++;
      matchedFieldTokens.add(bestFieldToken);
    }
  }

  const effectiveMatches = exactMatches + fuzzyMatchCount * 0.5;
  const tokenScore =
    (2 * effectiveMatches) / (fieldTokens.length + columnTokens.length);

  let typeBonus = 0;

  if (
    column.detectedType !== "mixed" &&
    column.detectedType !== "empty"
  ) {
    if (field.type.includes(column.detectedType)) {
      typeBonus += 0.1;
    }
    if (column.detectedType === "boolean" && field.type.includes("boolean")) {
      typeBonus += 0.1;
    }
  }

  if (field.type.includes("number") && column.detectedType === "string") {
    typeBonus -= 0.08;
  }
  if (field.type.includes("date") && column.detectedType === "string") {
    typeBonus -= 0.05;
  }

  if (field.required && column.nullRate > 0.5) {
    typeBonus -= 0.1;
  }

  if (
    column.uniqueCount !== undefined &&
    column.uniqueCount <= 2 &&
    !field.type.includes("boolean")
  ) {
    typeBonus -= 0.05;
  }

  return Math.max(0, Math.min(tokenScore + typeBonus, 0.98));
}

function inferTransform(
  field: TargetField,
  column: ColumnProfile,
): TransformRule {
  if (field.type.includes("number") && column.detectedType !== "number") {
    return "to_number";
  }

  if (field.type.includes("date")) {
    return "parse_date";
  }

  return "trim";
}

export function buildHeuristicMapping(
  input: SchemaMatchInput,
): SchemaMatchResult {
  const targetFields = flattenJsonSchema(input.targetJsonSchema);
  const sourceColumns = input.sourceColumns;

  logBackendEvent("info", "heuristic-mapper", "Heuristic mapping started", {
    targetFieldCount: targetFields.length,
    sourceColumnCount: sourceColumns.length,
    sourceColumns: sourceColumns.map((c) => c.name),
    sheetName: input.sourceSheetName,
  });

  if (targetFields.length === 0) {
    logBackendEvent("warn", "heuristic-mapper", "No target fields to map");
    return { mappings: [], warnings: ["No target fields to map."] };
  }

  const allScores: { target: TargetField; column: ColumnProfile; score: number }[] = [];
  for (const field of targetFields) {
    for (const column of sourceColumns) {
      allScores.push({
        target: field,
        column,
        score: scoreMatch(field, column),
      });
    }
  }

  const bestForTarget = new Map<TargetField, { column: ColumnProfile; score: number }>();
  for (const field of targetFields) {
    const fieldScores = allScores
      .filter((s) => s.target === field)
      .sort((a, b) => b.score - a.score);
    if (fieldScores[0] && fieldScores[0].score >= 0.25) {
      bestForTarget.set(field, {
        column: fieldScores[0].column,
        score: fieldScores[0].score,
      });
    }
  }

  const sortedTargets = [...targetFields].sort((a, b) => {
    const aScore = bestForTarget.get(a)?.score ?? 0;
    const bScore = bestForTarget.get(b)?.score ?? 0;
    return bScore - aScore;
  });

  logBackendEvent("info", "heuristic-mapper", "Assignment order (pickiest first)", {
    order: sortedTargets.map((f) => ({
      targetPath: f.path,
      bestScore: bestForTarget.get(f)?.score ?? null,
      bestColumn: bestForTarget.get(f)?.column.name ?? null,
    })),
  });

  const usedColumns = new Set<string>();
  const mappings: FieldMapping[] = [];

  for (const field of sortedTargets) {
    const candidates = allScores
      .filter((s) => s.target === field && !usedColumns.has(s.column.name))
      .sort((a, b) => b.score - a.score);

    const best = candidates[0];

    if (!best || best.score < 0.25) {
      const skippedReason = best
        ? `Best match "${best.column.name}" (score: ${best.score.toFixed(2)}) already assigned to another field.`
        : "No strong lexical or type match was found.";
      logBackendEvent("warn", "heuristic-mapper", "Field unmapped", {
        targetPath: field.path,
        reason: skippedReason,
        topCandidates: candidates.slice(0, 3).map((c) => ({
          column: c.column.name,
          score: Number(c.score.toFixed(2)),
        })),
      });
      mappings.push({
        targetPath: field.path,
        sourceColumn: null,
        confidence: 0,
        transform: "none",
        reason: skippedReason,
      });
      continue;
    }

    usedColumns.add(best.column.name);

    const transform = inferTransform(field, best.column);
    const confidence = Number(best.score.toFixed(2));
    logBackendEvent("info", "heuristic-mapper", "Field mapped", {
      targetPath: field.path,
      sourceColumn: best.column.name,
      confidence,
      transform,
      competitors: candidates.slice(1, 3).map((c) => ({
        column: c.column.name,
        score: Number(c.score.toFixed(2)),
      })),
    });

    mappings.push({
      targetPath: field.path,
      sourceColumn: best.column.name,
      confidence,
      transform,
      reason: `Matched "${best.column.name}" using header similarity (score: ${best.score.toFixed(2)}) and type detection.`,
    });
  }

  const unmapped = mappings.filter((m) => m.sourceColumn === null).length;
  const mapped = mappings.length - unmapped;
  logBackendEvent("info", "heuristic-mapper", "Heuristic mapping complete", {
    totalTargets: targetFields.length,
    mapped,
    unmapped,
    usedColumns: [...usedColumns],
    mappingTable: mappings.map((m) => ({
      targetPath: m.targetPath,
      sourceColumn: m.sourceColumn ?? "(none)",
      confidence: m.confidence,
      transform: m.transform,
    })),
  });

  return {
    mappings,
    warnings: unmapped > 0
      ? ["Some fields could not be automatically mapped."]
      : [],
  };
}
