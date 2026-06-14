import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { readAllRows } from "@/lib/excel/excel.service";
import { getRunWithRelations } from "@/lib/mapping/mapping.service";
import type { FieldMapping } from "@/lib/mapping/mapping.types";
import { applyMappingToRows } from "@/lib/mapping/transform.service";
import { prisma } from "@/lib/prisma";
import { validateJsonAgainstSchema } from "@/lib/schema/json-schema";
import { defineApiRouteHandlers } from "@/lib/api-error-handler";
import { serverT } from "@/i18n/server";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export const { POST } = defineApiRouteHandlers({
  POST: async (_: Request, context: RouteContext) => {
    const { id } = await Promise.resolve(context.params);
    const run = await getRunWithRelations(id);

    if (!run) {
      return NextResponse.json({ error: serverT("api.runNotFound") }, { status: 404 });
    }

    const confirmed =
      (run.confirmedMapping as { mappings?: FieldMapping[] } | null)?.mappings ?? [];

    if (!confirmed.length) {
      return NextResponse.json(
        { error: serverT("api.confirmMappingFirst") },
        { status: 400 },
      );
    }

    if (!run.uploadedFile) {
      return NextResponse.json(
        { error: serverT("api.noUploadedFileAttached") },
        { status: 400 },
      );
    }

    const workbook = await readAllRows({
      filePath: run.uploadedFile.storagePath,
      preferredSheetName: run.sourceSheetName,
    });
    const jsonOutput = applyMappingToRows(workbook.rows, confirmed);
    const validation = validateJsonAgainstSchema(
      {
        type: "array",
        items: run.schemaTemplate.jsonSchema,
      },
      jsonOutput,
    );
    const jsonOutputValue = jsonOutput as Prisma.InputJsonValue;
    const validationErrorsValue = JSON.parse(
      JSON.stringify(validation.errors),
    ) as Prisma.InputJsonValue;

    const output = await prisma.generatedOutput.upsert({
      where: { mappingRunId: run.id },
      update: {
        jsonOutput: jsonOutputValue,
        errors: validationErrorsValue,
      },
      create: {
        mappingRunId: run.id,
        jsonOutput: jsonOutputValue,
        errors: validationErrorsValue,
      },
    });

    await prisma.mappingRun.update({
      where: { id: run.id },
      data: {
        status: validation.valid ? "completed" : "completed_with_errors",
      },
    });

    return NextResponse.json({
      output,
      validation,
    });
  },
});
