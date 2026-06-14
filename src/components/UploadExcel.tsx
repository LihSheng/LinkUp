"use client";

import { useRef } from "react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Card className="rounded-[2rem] p-6 gap-0">
      <CardContent className="p-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge variant="outline" className="rounded-full">{t("uploadExcel.badge")}</Badge>
            <h2 className="mt-3 text-2xl font-semibold">{t("uploadExcel.title")}</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {t("uploadExcel.description")}
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
            {isUploading ? t("uploadExcel.uploading") : t("uploadExcel.chooseFile")}
          </Button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="rounded-[1.7rem] border border-dashed border-border bg-card/70 p-6">
            <p className="text-sm font-semibold">{t("uploadExcel.whatHappens")}</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>{t("uploadExcel.whatHappensDesc")}</li>
              <li>{t("uploadExcel.sampleRows")}</li>
              <li>{t("uploadExcel.aiMapping")}</li>
            </ul>
          </div>
          <div className="rounded-[1.7rem] border border-border bg-card/70 p-5 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">{t("uploadExcel.currentSchema")}</p>
            <p className="mt-2">{activeTemplateName ?? t("uploadExcel.selectSchema")}</p>
            {disabled ? (
              <p className="mt-3 text-[var(--color-warning)]">
                {t("uploadExcel.uploadDisabled")}
              </p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
