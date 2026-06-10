import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { readWorkbookMeta } from "@/lib/excel/excel.service";
import { prisma } from "@/lib/prisma";
import { persistUpload } from "@/lib/storage";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A file upload is required." }, { status: 400 });
  }

  const storagePath = await persistUpload(file);
  const workbookMeta = await readWorkbookMeta(storagePath);

  const uploadedFile = await prisma.uploadedFile.create({
    data: {
      originalName: file.name,
      storagePath,
      workbookMeta: workbookMeta as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({ uploadedFile }, { status: 201 });
}
