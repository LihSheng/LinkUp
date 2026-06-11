"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import clsx from "clsx";

const steps = [
  { href: "/wizard/schema", label: "Schema", number: "01" },
  { href: "/wizard/workbook", label: "Workbook", number: "02" },
  { href: "/wizard/mapping", label: "Mapping", number: "03" },
  { href: "/wizard/output", label: "Output", number: "04" },
] as const;

export function WizardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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

        <div className="wizard-progress-card">
          <p className="dashboard-card-kicker">Sequence</p>
          <p>Four pages for one mapping journey, with the old monolith still available in the lab.</p>
        </div>

        <nav className="wizard-step-nav" aria-label="Wizard steps">
          {steps.map((step) => {
            const active = pathname === step.href;

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
            <h1>Schema matching flow</h1>
          </div>
          <div className="wizard-topbar-actions">
            <Link href="/" className="ghost-button">
              Back to dashboard
            </Link>
            <Link href="/studio" className="primary-button">
              Open lab
            </Link>
          </div>
        </header>

        <main className="wizard-content">{children}</main>
      </div>
    </div>
  );
}
