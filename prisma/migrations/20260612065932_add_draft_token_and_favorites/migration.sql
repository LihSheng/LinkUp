-- CreateTable
CREATE TABLE "SchemaTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "jsonSchema" JSONB NOT NULL,
    "canonicalFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchemaTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadedFile" (
    "id" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "workbookMeta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadedFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MappingRun" (
    "id" TEXT NOT NULL,
    "uploadedFileId" TEXT,
    "schemaTemplateId" TEXT NOT NULL,
    "sourceSheetName" TEXT,
    "columnProfiles" JSONB,
    "sampleRows" JSONB,
    "suggestedMapping" JSONB,
    "confirmedMapping" JSONB,
    "draftToken" TEXT,
    "displayName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MappingRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MappingTemplate" (
    "id" TEXT NOT NULL,
    "schemaTemplateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceSignature" TEXT,
    "confirmedMapping" JSONB NOT NULL,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MappingTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedOutput" (
    "id" TEXT NOT NULL,
    "mappingRunId" TEXT NOT NULL,
    "jsonOutput" JSONB NOT NULL,
    "errors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedOutput_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MappingRun_draftToken_key" ON "MappingRun"("draftToken");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedOutput_mappingRunId_key" ON "GeneratedOutput"("mappingRunId");

-- AddForeignKey
ALTER TABLE "MappingRun" ADD CONSTRAINT "MappingRun_uploadedFileId_fkey" FOREIGN KEY ("uploadedFileId") REFERENCES "UploadedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MappingRun" ADD CONSTRAINT "MappingRun_schemaTemplateId_fkey" FOREIGN KEY ("schemaTemplateId") REFERENCES "SchemaTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MappingTemplate" ADD CONSTRAINT "MappingTemplate_schemaTemplateId_fkey" FOREIGN KEY ("schemaTemplateId") REFERENCES "SchemaTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedOutput" ADD CONSTRAINT "GeneratedOutput_mappingRunId_fkey" FOREIGN KEY ("mappingRunId") REFERENCES "MappingRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
