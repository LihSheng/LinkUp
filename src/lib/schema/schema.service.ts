import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { flattenJsonSchema } from "@/lib/schema/json-schema";

export async function listSchemaTemplates() {
  return prisma.schemaTemplate.findMany({
    orderBy: { updatedAt: "desc" },
  });
}

function computeCanonicalFields(jsonSchema: unknown) {
  return flattenJsonSchema(jsonSchema).map((f) => ({
    path: f.path,
    type: f.type,
    required: f.required,
    description: f.description,
  }));
}

export async function createSchemaTemplate(input: {
  name: string;
  description?: string;
  jsonSchema: unknown;
}) {
  const canonicalFields = computeCanonicalFields(input.jsonSchema);

  return prisma.schemaTemplate.create({
    data: {
      name: input.name,
      description: input.description,
      jsonSchema: input.jsonSchema as Prisma.InputJsonValue,
      canonicalFields: canonicalFields as Prisma.InputJsonValue,
    },
  });
}

export async function updateSchemaTemplate(
  templateId: string,
  input: {
    name: string;
    description?: string;
    jsonSchema: unknown;
  },
) {
  const canonicalFields = computeCanonicalFields(input.jsonSchema);

  return prisma.schemaTemplate.update({
    where: { id: templateId },
    data: {
      name: input.name,
      description: input.description,
      jsonSchema: input.jsonSchema as Prisma.InputJsonValue,
      canonicalFields: canonicalFields as Prisma.InputJsonValue,
    },
  });
}
