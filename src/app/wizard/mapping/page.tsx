"use client";

import { useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import useSWR from "swr";

import { useWizardProgress } from "@/components/wizard/WizardProgressContext";
import { MappingWorkbench } from "@/components/wizard/MappingWorkbench";
import type { ColumnProfile, FieldMapping, TargetField } from "@/lib/mapping/mapping.types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function MappingStepPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const uploadId = searchParams.get("uploadId");
  const sheet = searchParams.get("sheet");
  const templateId = searchParams.get("templateId");
  const runId = searchParams.get("runId");
  const { completeStep, isStepAccessible, activeRunId } = useWizardProgress();
  const effectiveRunId = runId ?? activeRunId;

  const { data: existingRun, isLoading: isRunLoading } = useSWR(
    effectiveRunId ? `/api/mapping-runs/${effectiveRunId}` : null,
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
    if (effectiveRunId) params.set("runId", effectiveRunId);
    router.push(`/wizard/workbook?${params.toString()}`);
  }, [router, uploadId, sheet, templateId, effectiveRunId]);

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

  if (effectiveRunId && isRunLoading) {
    return (
      <div className="flex min-h-0 w-full flex-1 items-center justify-center">
        <p className="text-sm text-[var(--color-muted)]">{t("wizard.mapping.loadingDraft")}</p>
      </div>
    );
  }

  return (
      <MappingWorkbench
        onBack={handleBack}
        onComplete={handleComplete}
        initialRunId={effectiveRunId ?? undefined}
        initialTargetFields={initialTargetFields}
        initialColumnProfiles={initialColumnProfiles}
        initialMappings={initialMappings}
    />
  );
}
