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

  const { data: existingRun } = useSWR(
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
    router.push(`/wizard/workbook?${params.toString()}`);
  }, [router, uploadId, sheet, templateId]);

  const handleComplete = useCallback((runId?: string) => {
    completeStep(2);
    const params = new URLSearchParams(searchParams.toString());
    if (runId && !params.has("runId")) params.set("runId", runId);
    const qs = params.toString();
    router.push(`/wizard/output${qs ? `?${qs}` : ""}`);
  }, [completeStep, router, searchParams]);

  const confirmedMapping = existingRun?.run?.confirmedMapping as { mappings?: FieldMapping[] } | null;
  const initialMappings = confirmedMapping?.mappings;
  const initialTargetFields = existingRun?.run?.targetFields as TargetField[] | undefined;
  const initialColumnProfiles = existingRun?.run?.columnProfiles as ColumnProfile[] | undefined;

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
