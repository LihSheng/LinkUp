import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { flattenJsonSchema } from "@/lib/schema/json-schema";
import { defineApiRouteHandlers } from "@/lib/api-error-handler";
import { serverT } from "@/i18n/server";

export const { GET } = defineApiRouteHandlers({
  GET: async (request: NextRequest) => {
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: serverT("api.draftTokenRequired") },
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
        { error: serverT("api.draftNotFound") },
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
  },
});
