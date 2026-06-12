"use client";

import { useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";

import { useWizardProgress } from "@/components/wizard/WizardProgressContext";
import { MappingWorkbench } from "@/components/wizard/MappingWorkbench";
import type { ColumnProfile, FieldMapping, TargetField } from "@/lib/mapping/mapping.types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function MappingStepPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const uploadId = searchParams.get("uploadId");
  const sheet = searchParams.get("sheet");
  const templateId = searchParams.get("templateId");
  const runId = searchParams.get("runId");
  const { completeStep, isStepAccessible } = useWizardProgress();

  const { data: existingRun, isLoading: isRunLoading } = useSWR(
    runId ? `/api/mapping-runs/${runId}` : null,
    fetcher,
  );

  useEffect(() => {
    if (!isStepAccessible(2)) {
      router.replace("/wizard/schema");
    }
  }, [isStepAccessible, router]);

  const handleBack = useCallback(() => {
    const params = new URLSearchParams();
    if (uploadId) params.set("uploadId", uploadId);
    if (sheet) params.set("sheet", sheet);
    if (templateId) params.set("templateId", templateId);
    if (runId) params.set("runId", runId);
    router.push(`/wizard/workbook?${params.toString()}`);
  }, [router, uploadId, sheet, templateId, runId]);

  const handleComplete = useCallback((completedRunId?: string, mappingTemplateId?: string) => {
    completeStep(2);
    const params = new URLSearchParams(searchParams.toString());
    if (completedRunId && !params.has("runId")) params.set("runId", completedRunId);
    if (mappingTemplateId) params.set("mappingTemplateId", mappingTemplateId);
    const qs = params.toString();
    router.push(`/wizard/output${qs ? `?${qs}` : ""}`);
  }, [completeStep, router, searchParams]);

  const run = existingRun?.run;
  const confirmedMapping = run?.confirmedMapping as { mappings?: FieldMapping[] } | null;
  const initialMappings = confirmedMapping?.mappings;
  const initialTargetFields = run?.targetFields as TargetField[] | undefined;
  const initialColumnProfiles = run?.columnProfiles as ColumnProfile[] | undefined;

  if (runId && isRunLoading) {
    return (
      <div className="flex min-h-0 w-full flex-1 items-center justify-center">
        <p className="text-sm text-[var(--color-muted)]">Loading draft...</p>
      </div>
    );
  }

  return (
    <MappingWorkbench
      onBack={handleBack}
      onComplete={handleComplete}
      initialRunId={runId ?? undefined}
      initialTargetFields={initialTargetFields}
      initialColumnProfiles={initialColumnProfiles}
      initialMappings={initialMappings}
    />
  );
}
