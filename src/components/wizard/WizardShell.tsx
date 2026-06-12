"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import clsx from "clsx";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const router = useRouter();
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const activeStep = steps.find((step) => step.href === pathname) ?? steps[0];
  const { isStepAccessible } = useWizardProgress();
  const showSharedTopBar = true;
  const requireBackConfirmation = true;

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

        <div className="wizard-sidebar-bottom">
          {requireBackConfirmation ? (
            <button
              type="button"
              className="ghost-button"
              onClick={() => setShowBackConfirm(true)}
            >
              Back to dashboard
            </button>
          ) : (
            <Link href="/" className="ghost-button">
              Back to dashboard
            </Link>
          )}
        </div>
      </aside>

      <AlertDialog open={showBackConfirm} onOpenChange={setShowBackConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave wizard?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved progress. Going back to the dashboard will discard any changes made
              in this step.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push("/")}>
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="wizard-main-shell">
        {showSharedTopBar ? (
          <WizardTopBar
            stepNumber={`Step ${activeStep.number}`}
            title={activeStep.title}
            description={activeStep.description}
          />
        ) : null}
        <main className="wizard-content">{children}</main>
      </div>
    </div>
  );
}
