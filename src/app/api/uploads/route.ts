import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { previewWorkbook, readWorkbookMeta } from "@/lib/excel/excel.service";
import { prisma } from "@/lib/prisma";
import { persistUpload } from "@/lib/storage";
import { defineApiRouteHandlers } from "@/lib/api-error-handler";
import { serverT } from "@/i18n/server";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv"];

export const { POST } = defineApiRouteHandlers({
  POST: async (request: Request) => {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: serverT("api.uploadRequired") }, { status: 400 });
    }

    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: serverT("api.unsupportedType") }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: serverT("api.fileTooLarge") }, { status: 400 });
    }

    const storagePath = await persistUpload(file);
    const workbookMeta = await readWorkbookMeta(storagePath);

    let preview = null;
    try {
      preview = await previewWorkbook({ filePath: storagePath });
    } catch {
      // non-blocking — preview may fail for empty or malformed workbooks
    }

    const uploadedFile = await prisma.uploadedFile.create({
      data: {
        originalName: file.name,
        storagePath,
        workbookMeta: {
          ...workbookMeta,
          fileSize: file.size,
        } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ uploadedFile, preview }, { status: 201 });
  },
});
