import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { defineApiRouteHandlers } from "@/lib/api-error-handler";
import { serverT } from "@/i18n/server";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export const { GET } = defineApiRouteHandlers({
  GET: async (_: Request, context: RouteContext) => {
    const { id } = await Promise.resolve(context.params);

    const schemaTemplate = await prisma.schemaTemplate.findUnique({
      where: { id },
    });

    if (!schemaTemplate) {
      return NextResponse.json(
        { error: serverT("api.schemaTemplateNotFound") },
        { status: 404 },
      );
    }

    const mappingTemplates = await prisma.mappingTemplate.findMany({
      where: { schemaTemplateId: id },
      orderBy: [{ isFavorite: "desc" }, { updatedAt: "desc" }],
    });

    return NextResponse.json({ templates: mappingTemplates });
  },
});
