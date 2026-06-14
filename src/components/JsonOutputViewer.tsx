"use client";

import { useTranslation } from "react-i18next";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

type JsonOutputViewerProps = {
  output: unknown;
  errors: unknown;
};

export function JsonOutputViewer({ output, errors }: JsonOutputViewerProps) {
  const { t } = useTranslation();
  const hasErrors =
    Array.isArray(errors) ? errors.length > 0 : Boolean(errors && JSON.stringify(errors) !== "[]");

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
      <Card className="rounded-[2rem] p-6 gap-0">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 p-0">
          <div>
            <Badge variant="outline" className="rounded-full">{t("legacy.jsonViewer.badge")}</Badge>
            <h2 className="mt-3 text-2xl font-semibold">{t("legacy.jsonViewer.title")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("legacy.jsonViewer.description")}
            </p>
          </div>
          <Badge variant={hasErrors ? "destructive" : "secondary"}>
            {hasErrors ? t("legacy.jsonViewer.validationNeedsReview") : t("legacy.jsonViewer.validationPassed")}
          </Badge>
        </CardHeader>
        <CardContent className="p-0 mt-5">
          <ScrollArea className="max-h-[42rem] rounded-[1.5rem] bg-[#fffdfa] p-4">
            <pre className="code text-xs leading-6 m-0">
              {JSON.stringify(output, null, 2)}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] p-6 gap-0">
        <CardHeader className="p-0">
          <h3 className="text-xl font-semibold">{t("legacy.jsonViewer.validationReport")}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("legacy.jsonViewer.validationReportDesc")}
          </p>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          <ScrollArea className="max-h-[42rem] rounded-[1.5rem] bg-[#fffdfa] p-4">
            <pre className="code text-xs leading-6 m-0">
              {JSON.stringify(errors, null, 2)}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
