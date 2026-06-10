import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const uploadDir = path.join(process.cwd(), "storage", "uploads");

export function getUploadDir() {
  return uploadDir;
}

export async function persistUpload(file: File) {
  const bytes = await file.arrayBuffer();
  const uploadDir = getUploadDir();
  await mkdir(uploadDir, { recursive: true });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = path.join(uploadDir, `${Date.now()}-${safeName}`);

  await writeFile(storagePath, Buffer.from(bytes));

  return storagePath;
}
