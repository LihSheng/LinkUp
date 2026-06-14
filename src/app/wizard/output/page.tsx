"use client";

import { useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import useSWR from "swr";

import { useWizardProgress } from "@/components/wizard/WizardProgressContext";
import { MappingCompleteScreen } from "@/components/wizard/MappingCompleteScreen";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function OutputStepPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const runId = searchParams.get("runId");
  const mappingTemplateId = searchParams.get("mappingTemplateId");
  const { completeStep, isStepAccessible } = useWizardProgress();

  const { data, error, isLoading } = useSWR(
    runId ? `/api/mapping-runs/${runId}` : null,
    fetcher,
  );

  useEffect(() => {
    if (!isStepAccessible(3)) {
      router.replace("/wizard/schema");
    }
  }, [isStepAccessible, router]);

  useEffect(() => {
    if (isStepAccessible(3) && !runId) {
      router.replace("/wizard/mapping");
    }
  }, [isStepAccessible, runId, router]);

  const handleBack = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    router.push(`/wizard/mapping${params.toString() ? `?${params.toString()}` : ""}`);
  }, [router, searchParams]);

  const handleFinish = useCallback(() => {
    completeStep(3);
    router.push("/");
  }, [completeStep, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-0 w-full flex-1 items-center justify-center">
        <p className="text-sm text-[var(--color-muted)]">{t("wizard.output.loading")}</p>
      </div>
    );
  }

  if (error || !data?.run) {
    return (
      <div className="mx-auto flex min-h-0 w-full max-w-[600px] flex-1 flex-col items-center justify-center gap-4 px-1">
        <p className="text-sm text-[var(--color-error)]">
          {error ? t("wizard.output.loadFailed") : t("wizard.output.noData")}
        </p>
        <button type="button" className="ghost-button" onClick={handleBack}>
          {t("wizard.output.backToMapping")}
        </button>
      </div>
    );
  }

  return (
    <MappingCompleteScreen
      runData={data.run}
      onBack={handleBack}
      onFinish={handleFinish}
      mappingTemplateId={mappingTemplateId ?? undefined}
    />
  );
}
