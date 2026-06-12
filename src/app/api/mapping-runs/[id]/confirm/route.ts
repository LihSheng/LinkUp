import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { confirmMappingSchema } from "@/lib/contracts";
import { getRunWithRelations } from "@/lib/mapping/mapping.service";
import { prisma } from "@/lib/prisma";
import { flattenJsonSchema } from "@/lib/schema/json-schema";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await Promise.resolve(context.params);
  const payload = confirmMappingSchema.parse(await request.json());
  const run = await getRunWithRelations(id);

  if (!run) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  const updated = await prisma.mappingRun.update({
    where: { id },
    data: {
      confirmedMapping: payload as Prisma.InputJsonValue,
      status: "confirmed",
    },
  });

  const sourceSignaturePayload = run.columnProfiles
    ? JSON.stringify(run.columnProfiles)
    : null;

  const templateName = run.displayName ?? run.schemaTemplate.name;

  const mappingTemplate = await prisma.mappingTemplate.create({
    data: {
      schemaTemplateId: run.schemaTemplateId,
      name: templateName,
      sourceSignature: sourceSignaturePayload,
      confirmedMapping: payload as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({
    run: {
      ...updated,
      schemaTemplate: run.schemaTemplate,
      targetFields: flattenJsonSchema(run.schemaTemplate.jsonSchema),
      workbookMeta: run.uploadedFile?.workbookMeta ?? null,
    },
    mappingTemplateId: mappingTemplate.id,
  });
}
