import { NextResponse } from "next/server";

import { updateRunSchema } from "@/lib/contracts";
import { getRunWithRelations } from "@/lib/mapping/mapping.service";
import { flattenJsonSchema } from "@/lib/schema/json-schema";
import { prisma } from "@/lib/prisma";
import { defineApiRouteHandlers } from "@/lib/api-error-handler";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export const { GET, PATCH } = defineApiRouteHandlers({
  GET: async (_: Request, context: RouteContext) => {
    const { id } = await Promise.resolve(context.params);
    const run = await getRunWithRelations(id);

    if (!run) {
      return NextResponse.json({ error: "Run not found." }, { status: 404 });
    }

    return NextResponse.json({
      run: {
        ...run,
        targetFields: flattenJsonSchema(run.schemaTemplate.jsonSchema),
        workbookMeta: run.uploadedFile?.workbookMeta ?? null,
      },
    });
  },
  PATCH: async (request: Request, context: RouteContext) => {
    const { id } = await Promise.resolve(context.params);
    const payload = updateRunSchema.parse(await request.json());

    const existing = await prisma.mappingRun.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Run not found." }, { status: 404 });
    }

    const updated = await prisma.mappingRun.update({
      where: { id },
      data: {
        ...(payload.uploadedFileId !== undefined && { uploadedFileId: payload.uploadedFileId }),
        ...(payload.sourceSheetName !== undefined && { sourceSheetName: payload.sourceSheetName }),
        ...(payload.displayName !== undefined && { displayName: payload.displayName }),
        ...(payload.uploadedFileId !== undefined && !existing.uploadedFileId && { status: "uploaded" }),
      },
      include: {
        uploadedFile: true,
        schemaTemplate: true,
        output: true,
      },
    });

    return NextResponse.json({
      run: {
        ...updated,
        targetFields: flattenJsonSchema(updated.schemaTemplate.jsonSchema),
        workbookMeta: updated.uploadedFile?.workbookMeta ?? null,
      },
    });
  },
});
