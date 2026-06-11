"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { WizardStepPage } from "@/components/wizard/WizardStepPage";
import { useWizardProgress } from "@/components/wizard/WizardProgressContext";

export default function WorkbookStepPage() {
  const router = useRouter();
  const { completeStep, isStepAccessible } = useWizardProgress();

  useEffect(() => {
    if (!isStepAccessible(1)) {
      router.replace("/wizard/schema");
    }
  }, [isStepAccessible, router]);

  return (
    <WizardStepPage
      step="Step 2"
      title="Upload the workbook"
      description="This slot will hold file upload, sheet selection, and preview rows. The layout is ready; the implementation can land later."
      note="The upload experience should stay simple: choose the source file, inspect the sheet that looks correct, then carry its sample rows forward into mapping."
      primaryHref="/wizard/mapping"
      primaryLabel="Continue to mapping"
      secondaryHref="/wizard/schema"
      secondaryLabel="Back to schema"
      stats={[
        { label: "Sheets", value: "1" },
        { label: "Samples", value: "20" },
        { label: "Columns", value: "8" },
      ]}
      onContinue={() => {
        completeStep(1);
        router.push("/wizard/mapping");
      }}
    >
      <div className="wizard-placeholder">
        <strong>Workbook upload placeholder</strong>
        <p>We can swap in the existing upload flow here once the wizard is ready.</p>
      </div>
    </WizardStepPage>
  );
}
