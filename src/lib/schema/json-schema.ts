import { cache } from "react";
import type { ErrorObject } from "ajv";
import Ajv from "ajv";
import type { AnySchema } from "ajv";

import type { TargetField } from "@/lib/mapping/mapping.types";

type JsonSchema = {
  type?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
};

function _flattenJsonSchema(
  schema: unknown,
  prefix = "",
  required = false,
): TargetField[] {
  if (!schema || typeof schema !== "object") {
    return [];
  }

  const typed = schema as JsonSchema;
  const nextType = typed.type ?? "object";

  const results: TargetField[] = [];

  if (nextType === "object" && typed.properties) {
    const requiredSet = new Set(typed.required ?? []);

    for (const [key, value] of Object.entries(typed.properties)) {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      results.push(..._flattenJsonSchema(value, nextPrefix, requiredSet.has(key)));
    }
  } else if (nextType === "array") {
    results.push({
      path: prefix,
      type: typed.items?.type ? `${typed.items.type}[]` : "array",
      required,
      description: typed.description,
    });
  } else {
    results.push({
      path: prefix,
      type: nextType,
      required,
      description: typed.description,
    });
  }

  const seen = new Set<string>();
  return results.filter((field) => {
    if (seen.has(field.path)) return false;
    seen.add(field.path);
    return true;
  });
}

export const flattenJsonSchema = cache(_flattenJsonSchema);

export function validateJsonAgainstSchema(
  schema: unknown,
  payload: unknown,
): { valid: boolean; errors: ErrorObject[] } {
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema as AnySchema);
  const valid = validate(payload);

  return {
    valid: Boolean(valid),
    errors: (validate.errors ?? []) as ErrorObject[],
  };
}
