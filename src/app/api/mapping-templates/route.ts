import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
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
}
