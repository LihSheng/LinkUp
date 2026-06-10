import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function listSchemaTemplates() {
  return prisma.schemaTemplate.findMany({
    orderBy: { updatedAt: "desc" },
  });
}

export async function createSchemaTemplate(input: {
  name: string;
  description?: string;
  jsonSchema: unknown;
}) {
  return prisma.schemaTemplate.create({
    data: {
      ...input,
      jsonSchema: input.jsonSchema as Prisma.InputJsonValue,
    },
  });
}
