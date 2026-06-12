import { NextResponse } from "next/server";

import { updateMappingTemplateSchema } from "@/lib/contracts";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await Promise.resolve(context.params);
  const payload = updateMappingTemplateSchema.parse(await request.json());

  const existing = await prisma.mappingTemplate.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Mapping template not found." },
      { status: 404 },
    );
  }

  const updated = await prisma.mappingTemplate.update({
    where: { id },
    data: payload,
  });

  return NextResponse.json({ template: updated });
}
