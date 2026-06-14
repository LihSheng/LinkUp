import { NextResponse } from "next/server";

import { jsonSchemaInputSchema } from "@/lib/contracts";
import { createSchemaTemplate, listSchemaTemplates } from "@/lib/schema/schema.service";
import { defineApiRouteHandlers } from "@/lib/api-error-handler";

export const { GET, POST } = defineApiRouteHandlers({
  GET: async () => {
    const templates = await listSchemaTemplates();
    return NextResponse.json({ templates });
  },
  POST: async (request: Request) => {
    const payload = jsonSchemaInputSchema.parse(await request.json());
    const template = await createSchemaTemplate(payload);

    return NextResponse.json({ template }, { status: 201 });
  },
});
