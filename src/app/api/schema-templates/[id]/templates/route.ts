import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function GET(_: Request, context: RouteContext) {
  const { id } = await Promise.resolve(context.params);

  const schemaTemplate = await prisma.schemaTemplate.findUnique({
    where: { id },
  });

  if (!schemaTemplate) {
    return NextResponse.json(
      { error: "Schema template not found." },
      { status: 404 },
    );
  }

  const mappingTemplates = await prisma.mappingTemplate.findMany({
    where: { schemaTemplateId: id },
    orderBy: [{ isFavorite: "desc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json({ templates: mappingTemplates });
}
