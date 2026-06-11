import { WizardStepPage } from "@/components/wizard/WizardStepPage";

export default function OutputStepPage() {
  return (
    <WizardStepPage
      step="Step 4"
      title="Review the generated output"
      description="This route is reserved for the record preview and final confirmation state. The skeleton keeps the route tree in place before the real UI lands."
      note="The output page should surface validation, transformed records, and a final confirmation action after mapping is locked."
      primaryHref="/wizard/schema"
      primaryLabel="Start a new wizard"
      secondaryHref="/wizard/mapping"
      secondaryLabel="Back to mapping"
      stats={[
        { label: "Records", value: "0" },
        { label: "Warnings", value: "0" },
        { label: "Errors", value: "0" },
      ]}
    >
      <div className="wizard-placeholder">
        <strong>Output preview placeholder</strong>
        <p>Final record review and import confirmation can slot in here later.</p>
      </div>
    </WizardStepPage>
  );
}
