import { WizardStepPage } from "@/components/wizard/WizardStepPage";

export default function SchemaStepPage() {
  return (
    <WizardStepPage
      step="Step 1"
      title="Choose the target schema"
      description="This page will become the schema-selection and schema-editor step. For now it is a clean shell with the right routing in place."
      note="Keep this step focused on the destination structure. The workbook, mapping, and output screens will stay separate so each decision has room to breathe."
      primaryHref="/wizard/workbook"
      primaryLabel="Continue to workbook"
      secondaryHref="/studio"
      secondaryLabel="Open matching lab"
      stats={[
        { label: "Fields", value: "12" },
        { label: "Required", value: "4" },
        { label: "Nested", value: "3" },
      ]}
    >
      <div className="wizard-placeholder">
        <strong>Schema builder placeholder</strong>
        <p>Later this will host the saved schema list, editor, and import actions.</p>
      </div>
    </WizardStepPage>
  );
}
