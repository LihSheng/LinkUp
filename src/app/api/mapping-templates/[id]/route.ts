import { NextResponse } from "next/server";

import { updateMappingTemplateSchema } from "@/lib/contracts";
import { prisma } from "@/lib/prisma";
import { defineApiRouteHandlers } from "@/lib/api-error-handler";
import { serverT } from "@/i18n/server";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export const { PATCH } = defineApiRouteHandlers({
  PATCH: async (request: Request, context: RouteContext) => {
    const { id } = await Promise.resolve(context.params);
    const payload = updateMappingTemplateSchema.parse(await request.json());

    const existing = await prisma.mappingTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: serverT("api.mappingTemplateNotFound") },
        { status: 404 },
      );
    }

    const updated = await prisma.mappingTemplate.update({
      where: { id },
      data: payload,
    });

    return NextResponse.json({ template: updated });
  },
});
