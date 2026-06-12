"use client";

import { useRef } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type UploadExcelProps = {
  disabled?: boolean;
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
  activeTemplateName?: string | null;
};

export function UploadExcel({
  disabled,
  onUpload,
  isUploading,
  activeTemplateName,
}: UploadExcelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Card className="rounded-[2rem] p-6 gap-0">
      <CardContent className="p-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge variant="outline" className="rounded-full">Workbook upload</Badge>
            <h2 className="mt-3 text-2xl font-semibold">Load the Excel source file</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Upload an Excel file to continue. The system will detect the best sheet,
              headers, and sample rows automatically.
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            disabled={disabled || isUploading}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (file) {
                await onUpload(file);
                event.target.value = "";
              }
            }}
          />
          <Button
            disabled={disabled || isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? "Uploading..." : "Choose Excel file"}
          </Button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="rounded-[1.7rem] border border-dashed border-border bg-card/70 p-6">
            <p className="text-sm font-semibold">What happens after upload</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>The workbook is profiled to detect likely header columns.</li>
              <li>Sample rows are extracted for mapping review.</li>
              <li>You can then ask Ollama or LM Studio to suggest field mappings.</li>
            </ul>
          </div>
          <div className="rounded-[1.7rem] border border-border bg-card/70 p-5 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">Current schema</p>
            <p className="mt-2">{activeTemplateName ?? "Select or save a schema first."}</p>
            {disabled ? (
              <p className="mt-3 text-[var(--color-warning)]">
                Upload is disabled until a schema template is available.
              </p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
