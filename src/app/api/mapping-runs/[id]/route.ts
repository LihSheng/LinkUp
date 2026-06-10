import { NextResponse } from "next/server";

import { getRunWithRelations } from "@/lib/mapping/mapping.service";
import { flattenJsonSchema } from "@/lib/schema/json-schema";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function GET(_: Request, context: RouteContext) {
  const { id } = await Promise.resolve(context.params);
  const run = await getRunWithRelations(id);

  if (!run) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  return NextResponse.json({
    run: {
      ...run,
      targetFields: flattenJsonSchema(run.schemaTemplate.jsonSchema),
    },
  });
}
