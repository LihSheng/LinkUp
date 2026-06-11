import { NextResponse } from "next/server";

import { jsonSchemaInputSchema } from "@/lib/contracts";
import {
  deleteSchemaTemplate,
  updateSchemaTemplate,
} from "@/lib/schema/schema.service";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await Promise.resolve(context.params);
  const payload = jsonSchemaInputSchema.parse(await request.json());
  const template = await updateSchemaTemplate(id, payload);

  return NextResponse.json({ template });
}

export async function DELETE(_: Request, context: RouteContext) {
  const { id } = await Promise.resolve(context.params);

  try {
    const template = await deleteSchemaTemplate(id);
    return NextResponse.json({ template });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete template.";
    const status = message === "Template not found." ? 404 : 409;
    return NextResponse.json({ error: message }, { status });
  }
}
