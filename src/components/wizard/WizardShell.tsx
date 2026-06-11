"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import clsx from "clsx";

import { useWizardProgress } from "./WizardProgressContext";
import { WizardTopBar } from "./WizardTopBar";

const steps = [
  { href: "/wizard/schema", label: "Schema", number: "01", title: "Choose a schema", subtitle: "Select data template", description: "Pick the schema that defines how your data should be structured." },
  { href: "/wizard/workbook", label: "Upload", number: "02", title: "Upload source file", subtitle: "Add your file", description: "Upload your spreadsheet or CSV file to be processed." },
  { href: "/wizard/mapping", label: "Mapping", number: "03", title: "Map fields", subtitle: "Match columns", description: "AI-powered column mapping — match source columns to schema fields." },
  { href: "/wizard/output", label: "Done", number: "04", title: "Review & export", subtitle: "Final output", description: "Review the results and export as structured JSON or filled Excel." },
] as const;

export function WizardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeStep = steps.find((step) => step.href === pathname) ?? steps[0];
  const { isStepAccessible } = useWizardProgress();

  return (
    <div className="workspace-shell wizard-shell-frame">
      <aside className="wizard-sidebar">
        <Link href="/" className="wizard-brand">
          <span className="wizard-brand-mark">L</span>
          <span>
            <strong>LinkUp</strong>
            <span>Wizard flow</span>
          </span>
        </Link>

        <nav className="wizard-step-nav" aria-label="Wizard steps">
          {steps.map((step, index) => {
            const active = pathname === step.href;
            const accessible = isStepAccessible(index);

            if (!accessible) {
              return (
                <span
                  key={step.href}
                  className={clsx("wizard-step-item", "is-disabled")}
                  aria-disabled="true"
                >
                  <span className="wizard-step-number">{step.number}</span>
                  <span>
                    <strong>{step.label}</strong>
                    <span>{step.subtitle}</span>
                  </span>
                </span>
              );
            }

            return (
              <Link
                key={step.href}
                href={step.href}
                className={clsx("wizard-step-item", active && "is-active")}
              >
                <span className="wizard-step-number">{step.number}</span>
                <span>
                  <strong>{step.label}</strong>
                  <span>{step.subtitle}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="wizard-sidebar-links">
          <Link href="/" className="dashboard-sidebar-link">
            Dashboard
          </Link>
          <Link href="/studio" className="dashboard-sidebar-link">
            Matching lab
          </Link>
        </div>
      </aside>

      <div className="wizard-main-shell">
        <WizardTopBar
          stepNumber={`Step ${activeStep.number}`}
          title={activeStep.title}
          description={activeStep.description}
          requireBackConfirmation={activeStep.number === "02" || activeStep.number === "03"}
        />

        <main className="wizard-content">{children}</main>
      </div>
    </div>
  );
}
