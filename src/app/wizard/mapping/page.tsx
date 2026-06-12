"use client";

import { useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useWizardProgress } from "@/components/wizard/WizardProgressContext";
import { MappingWorkbench } from "@/components/wizard/MappingWorkbench";

export default function MappingStepPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const uploadId = searchParams.get("uploadId");
  const sheet = searchParams.get("sheet");
  const templateId = searchParams.get("templateId");
  const { completeStep, isStepAccessible } = useWizardProgress();

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

  const handleComplete = useCallback(() => {
    completeStep(2);
    router.push("/wizard/output");
  }, [completeStep, router]);

  return (
    <MappingWorkbench
      onBack={handleBack}
      onComplete={handleComplete}
    />
  );
}
