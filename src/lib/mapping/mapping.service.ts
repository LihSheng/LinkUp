import { prisma } from "@/lib/prisma";

export async function getRunWithRelations(runId: string) {
  return prisma.mappingRun.findUnique({
    where: { id: runId },
    include: {
      uploadedFile: true,
      schemaTemplate: true,
      output: true,
    },
  });
}
