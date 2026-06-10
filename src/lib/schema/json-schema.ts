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

export function flattenJsonSchema(
  schema: unknown,
  prefix = "",
  required = false,
): TargetField[] {
  if (!schema || typeof schema !== "object") {
    return [];
  }

  const typed = schema as JsonSchema;
  const nextType = typed.type ?? "object";

  if (nextType === "object" && typed.properties) {
    const requiredSet = new Set(typed.required ?? []);

    return Object.entries(typed.properties).flatMap(([key, value]) => {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      return flattenJsonSchema(value, nextPrefix, requiredSet.has(key));
    });
  }

  if (nextType === "array") {
    return [
      {
        path: prefix,
        type: typed.items?.type ? `${typed.items.type}[]` : "array",
        required,
        description: typed.description,
      },
    ];
  }

  return [
    {
      path: prefix,
      type: nextType,
      required,
      description: typed.description,
    },
  ];
}

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
