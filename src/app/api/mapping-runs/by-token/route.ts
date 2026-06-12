import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { flattenJsonSchema } from "@/lib/schema/json-schema";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: "Draft token is required." },
      { status: 400 },
    );
  }

  const run = await prisma.mappingRun.findUnique({
    where: { draftToken: token },
    include: {
      uploadedFile: true,
      schemaTemplate: true,
      output: true,
    },
  });

  if (!run) {
    return NextResponse.json(
      { error: "Draft not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    run: {
      ...run,
      targetFields: flattenJsonSchema(run.schemaTemplate.jsonSchema),
      workbookMeta: run.uploadedFile?.workbookMeta ?? null,
    },
  });
}
