import { NextResponse } from "next/server";

import { jsonSchemaInputSchema } from "@/lib/contracts";
import { updateSchemaTemplate } from "@/lib/schema/schema.service";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await Promise.resolve(context.params);
  const payload = jsonSchemaInputSchema.parse(await request.json());
  const template = await updateSchemaTemplate(id, payload);

  return NextResponse.json({ template });
}
