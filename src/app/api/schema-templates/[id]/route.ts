import { NextResponse } from "next/server";

import { jsonSchemaInputSchema } from "@/lib/contracts";
import {
  deleteSchemaTemplate,
  updateSchemaTemplate,
} from "@/lib/schema/schema.service";
import { defineApiRouteHandlers } from "@/lib/api-error-handler";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export const { PATCH, DELETE } = defineApiRouteHandlers({
  PATCH: async (request: Request, context: RouteContext) => {
    const { id } = await Promise.resolve(context.params);
    const payload = jsonSchemaInputSchema.parse(await request.json());
    const template = await updateSchemaTemplate(id, payload);

    return NextResponse.json({ template });
  },
  DELETE: async (_: Request, context: RouteContext) => {
    const { id } = await Promise.resolve(context.params);
    const template = await deleteSchemaTemplate(id);

    return NextResponse.json({ template });
  },
});
