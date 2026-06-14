import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { previewWorkbook } from "@/lib/excel/excel.service";
import { getRunWithRelations } from "@/lib/mapping/mapping.service";
import { prisma } from "@/lib/prisma";
import { flattenJsonSchema } from "@/lib/schema/json-schema";
import type { CanonicalField } from "@/lib/excel/header-detection";
import { defineApiRouteHandlers } from "@/lib/api-error-handler";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export const { POST } = defineApiRouteHandlers({
  POST: async (_: Request, context: RouteContext) => {
    const { id } = await Promise.resolve(context.params);
    const run = await getRunWithRelations(id);

    if (!run) {
      return NextResponse.json({ error: "Run not found." }, { status: 404 });
    }

    if (!run.uploadedFileId || !run.uploadedFile) {
      return NextResponse.json(
        { error: "No uploaded file attached to this run." },
        { status: 400 },
      );
    }

    if (run.columnProfiles && Array.isArray(run.columnProfiles) && (run.columnProfiles as unknown[]).length > 0) {
      return NextResponse.json({
        run: {
          ...run,
          targetFields: flattenJsonSchema(run.schemaTemplate.jsonSchema),
          workbookMeta: run.uploadedFile.workbookMeta,
        },
      });
    }

    const targetFields = flattenJsonSchema(run.schemaTemplate.jsonSchema);

    let canonicalFields: CanonicalField[] | undefined;

    if (run.schemaTemplate.canonicalFields) {
      canonicalFields = run.schemaTemplate.canonicalFields as CanonicalField[];
    } else {
      canonicalFields = targetFields.map((f) => ({
        path: f.path,
        type: f.type,
        required: f.required,
        description: f.description,
      }));
    }

    const preview = await previewWorkbook({
      filePath: run.uploadedFile.storagePath,
      preferredSheetName: run.sourceSheetName,
      templateFields: canonicalFields,
    });

    const hasDetection =
      "detection" in preview && preview.detection !== undefined;

    const updated = await prisma.mappingRun.update({
      where: { id },
      data: {
        columnProfiles: preview.columnProfiles as Prisma.InputJsonValue,
        sampleRows: preview.sampleRows as Prisma.InputJsonValue,
        sourceSheetName: preview.sourceSheetName,
        status: "profiled",
      },
    });

    const response: Record<string, unknown> = {
      run: {
        ...updated,
        uploadedFile: run.uploadedFile,
        schemaTemplate: run.schemaTemplate,
        targetFields,
        workbookMeta: run.uploadedFile.workbookMeta,
      },
    };

    if (hasDetection) {
      const detection = preview.detection!;
      response.detection = {
        headerRowIndex: detection.headerRowIndex,
        matchedFields: detection.matchedFields,
        confidence: detection.confidence,
        ambiguous: detection.ambiguous,
      };
    }

    return NextResponse.json(response);
  },
});
