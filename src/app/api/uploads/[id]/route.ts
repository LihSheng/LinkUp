import { NextResponse } from "next/server";

import { previewWorkbook, readWorkbookMeta } from "@/lib/excel/excel.service";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

export async function GET(_request: Request, context: { params: Params }) {
  const { id } = await context.params;

  const uploadedFile = await prisma.uploadedFile.findUnique({
    where: { id },
  });

  if (!uploadedFile) {
    return NextResponse.json({ error: "Uploaded file was not found." }, { status: 404 });
  }

  let workbookMeta = uploadedFile.workbookMeta;
  if (!workbookMeta) {
    workbookMeta = await readWorkbookMeta(uploadedFile.storagePath);
  }

  let preview = null;
  try {
    preview = await previewWorkbook({ filePath: uploadedFile.storagePath });
  } catch {
    // Non-blocking. A saved upload should still be restorable even if preview fails.
  }

  return NextResponse.json({
    uploadedFile: {
      ...uploadedFile,
      workbookMeta,
    },
    preview,
  });
}
