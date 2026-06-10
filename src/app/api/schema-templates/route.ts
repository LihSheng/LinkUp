import { NextResponse } from "next/server";

import { jsonSchemaInputSchema } from "@/lib/contracts";
import { createSchemaTemplate, listSchemaTemplates } from "@/lib/schema/schema.service";

export async function GET() {
  const templates = await listSchemaTemplates();
  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  const payload = jsonSchemaInputSchema.parse(await request.json());
  const template = await createSchemaTemplate(payload);

  return NextResponse.json({ template }, { status: 201 });
}
