"use client";

import { useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";

import { useWizardProgress } from "@/components/wizard/WizardProgressContext";
import { MappingCompleteScreen } from "@/components/wizard/MappingCompleteScreen";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function OutputStepPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const runId = searchParams.get("runId");
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
        <p className="text-sm text-[var(--color-muted)]">Loading completion data...</p>
      </div>
    );
  }

  if (error || !data?.run) {
    return (
      <div className="mx-auto flex min-h-0 w-full max-w-[600px] flex-1 flex-col items-center justify-center gap-4 px-1">
        <p className="text-sm text-[var(--color-error)]">
          {error ? "Failed to load completion data." : "No mapping data found."}
        </p>
        <button type="button" className="ghost-button" onClick={handleBack}>
          Back to mapping
        </button>
      </div>
    );
  }

  return (
    <MappingCompleteScreen
      runData={data.run}
      onBack={handleBack}
      onFinish={handleFinish}
    />
  );
}
