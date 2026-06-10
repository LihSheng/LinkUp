import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { createRunSchema } from "@/lib/contracts";
import { previewWorkbook } from "@/lib/excel/excel.service";
import { prisma } from "@/lib/prisma";
import { flattenJsonSchema } from "@/lib/schema/json-schema";

export async function POST(request: Request) {
  const payload = createRunSchema.parse(await request.json());

  const uploadedFile = await prisma.uploadedFile.findUnique({
    where: { id: payload.uploadedFileId },
  });
  const schemaTemplate = await prisma.schemaTemplate.findUnique({
    where: { id: payload.schemaTemplateId },
  });

  if (!uploadedFile || !schemaTemplate) {
    return NextResponse.json(
      { error: "Uploaded file or schema template was not found." },
      { status: 404 },
    );
  }

  const preview = await previewWorkbook({
    filePath: uploadedFile.storagePath,
    preferredSheetName: payload.sourceSheetName,
  });

  const run = await prisma.mappingRun.create({
    data: {
      uploadedFileId: uploadedFile.id,
      schemaTemplateId: schemaTemplate.id,
      sourceSheetName: preview.sourceSheetName,
      columnProfiles: preview.columnProfiles as Prisma.InputJsonValue,
      sampleRows: preview.sampleRows as Prisma.InputJsonValue,
      status: "profiled",
    },
  });

  return NextResponse.json({
    run: {
      ...run,
      targetFields: flattenJsonSchema(schemaTemplate.jsonSchema),
      schemaTemplate,
      workbookMeta: uploadedFile.workbookMeta,
    },
  });
}
