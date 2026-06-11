"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import clsx from "clsx";

import { useWizardProgress } from "./WizardProgressContext";

const steps = [
  { href: "/wizard/schema", label: "Template", number: "01", title: "Schema templates" },
  { href: "/wizard/workbook", label: "Workbook", number: "02", title: "Upload workbook" },
  { href: "/wizard/mapping", label: "Mapping", number: "03", title: "Review mapping" },
  { href: "/wizard/output", label: "Output", number: "04", title: "Output preview" },
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
                    <span>{step.href.replace("/wizard/", "")}</span>
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
                  <span>{step.href.replace("/wizard/", "")}</span>
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
        <header className="wizard-topbar">
          <div>
            <p className="dashboard-kicker">Wizard</p>
            <h1>{activeStep.title}</h1>
          </div>
          <div className="wizard-topbar-actions">
            <Link href="/" className="ghost-button">
              Back to dashboard
            </Link>
          </div>
        </header>

        <main className="wizard-content">{children}</main>
      </div>
    </div>
  );
}
