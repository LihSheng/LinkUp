"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { WizardStepPage } from "@/components/wizard/WizardStepPage";
import { useWizardProgress } from "@/components/wizard/WizardProgressContext";

export default function OutputStepPage() {
  const router = useRouter();
  const { completeStep, isStepAccessible } = useWizardProgress();

  useEffect(() => {
    if (!isStepAccessible(3)) {
      router.replace("/wizard/schema");
    }
  }, [isStepAccessible, router]);

  return (
    <WizardStepPage
      step="Step 4"
      title="Review & export"
      description="This route is reserved for the record preview and final confirmation state. The skeleton keeps the route tree in place before the real UI lands."
      note="The output page should surface validation, transformed records, and a final confirmation action after mapping is locked."
      statusText="Review results and export your data"
      stats={[
        { label: "Records", value: "0" },
        { label: "Warnings", value: "0" },
        { label: "Errors", value: "0" },
      ]}
      primaryLabel="Done"
      onContinue={() => {
        completeStep(3);
        router.push("/");
      }}
      onBack={() => router.push("/wizard/mapping")}
    >
      <div className="wizard-placeholder">
        <strong>Output preview placeholder</strong>
        <p>Final record review and import confirmation can slot in here later.</p>
      </div>
    </WizardStepPage>
  );
}
