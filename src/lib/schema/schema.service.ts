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

export async function deleteSchemaTemplate(templateId: string) {
  const template = await prisma.schemaTemplate.findUnique({
    where: { id: templateId },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          runs: true,
          templates: true,
        },
      },
    },
  });

  if (!template) {
    throw new Error("Template not found.");
  }

  const parts: string[] = [];
  if (template._count.runs > 0) {
    parts.push(`${template._count.runs} saved run(s)`);
  }
  if (template._count.templates > 0) {
    parts.push(`${template._count.templates} mapping(s)`);
  }

  if (parts.length > 0) {
    throw new Error(
      `This template is still used by ${parts.join(" and ")} and cannot be deleted.`,
    );
  }

  await prisma.schemaTemplate.delete({
    where: { id: templateId },
  });

  return {
    id: template.id,
    name: template.name,
  };
}
