"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

type JsonOutputViewerProps = {
  output: unknown;
  errors: unknown;
};

export function JsonOutputViewer({ output, errors }: JsonOutputViewerProps) {
  const hasErrors =
    Array.isArray(errors) ? errors.length > 0 : Boolean(errors && JSON.stringify(errors) !== "[]");

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
      <Card className="rounded-[2rem] p-6 gap-0">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 p-0">
          <div>
            <Badge variant="outline" className="rounded-full">JSON output</Badge>
            <h2 className="mt-3 text-2xl font-semibold">Preview the generated records</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This is the transformed payload after the confirmed mapping was applied to
              every workbook row.
            </p>
          </div>
          <Badge variant={hasErrors ? "destructive" : "secondary"}>
            {hasErrors ? "Validation needs review" : "Validation passed"}
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
          <h3 className="text-xl font-semibold">Validation report</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Review this only if the output is blocked or you want the exact schema errors.
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
