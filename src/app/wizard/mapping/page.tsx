"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { WizardStepPage } from "@/components/wizard/WizardStepPage";
import { useWizardProgress } from "@/components/wizard/WizardProgressContext";

export default function MappingStepPage() {
  const router = useRouter();
  const { completeStep, isStepAccessible } = useWizardProgress();

  useEffect(() => {
    if (!isStepAccessible(2)) {
      router.replace("/wizard/schema");
    }
  }, [isStepAccessible, router]);

  return (
    <WizardStepPage
      step="Step 3"
      title="Resolve schema mappings"
      description="This is where the matching interface will eventually live in the wizard. For now, the existing full matching experience remains available in the lab."
      note="When we split the old screen into pages, this route will host the mapping table, AI suggestions, and review state."
      primaryHref="/wizard/output"
      primaryLabel="Continue to output"
      secondaryHref="/studio"
      secondaryLabel="Open matching lab"
      stats={[
        { label: "Mapped", value: "0/12" },
        { label: "Review", value: "0" },
        { label: "Duplicates", value: "0" },
      ]}
      onContinue={() => {
        completeStep(2);
        router.push("/wizard/output");
      }}
    >
      <div className="wizard-placeholder">
        <strong>Mapping workspace placeholder</strong>
        <p>
          The full schema-matching engine is still available in{" "}
          <Link href="/studio">the matching lab</Link> while this page remains a skeleton.
        </p>
      </div>
    </WizardStepPage>
  );
}
