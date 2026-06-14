import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { defineApiRouteHandlers } from "@/lib/api-error-handler";

export const { GET } = defineApiRouteHandlers({
  GET: async () => {
    const templates = await prisma.mappingTemplate.findMany({
      orderBy: [{ isFavorite: "desc" }, { updatedAt: "desc" }],
      include: {
        schemaTemplate: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ templates });
  },
});
