"use client";

import { useTranslation } from "react-i18next";
import { WizardFooter } from "./WizardFooter";

type WizardStepPageProps = {
  step: string;
  title: string;
  description: string;
  note: string;
  statusText: string;
  statusReady?: boolean;
  primaryLabel?: string;
  secondaryLabel?: string;
  stats: Array<{ label: string; value: string }>;
  children?: React.ReactNode;
  onContinue: () => void;
  onBack?: () => void;
};

export function WizardStepPage({
  step,
  title,
  description,
  note,
  statusText,
  statusReady,
  primaryLabel,
  secondaryLabel,
  stats,
  children,
  onContinue,
  onBack,
}: WizardStepPageProps) {
  const { t } = useTranslation();

  return (
    <div className="wizard-step-page">
      <section className="wizard-hero">
        <div>
          <p className="dashboard-card-kicker">{step}</p>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>

        <div className="wizard-hero-stats">
          {stats.map((stat) => (
            <div key={stat.label} className="wizard-stat-card">
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="wizard-panel">
        <div className="wizard-panel-copy">
          <p className="dashboard-card-kicker">{t("wizard.stepPage.skeletonNote")}</p>
          <p>{note}</p>
        </div>

        <div className="wizard-panel-body">{children}</div>
      </section>

      <WizardFooter
        statusText={statusText}
        statusReady={statusReady}
        primaryLabel={primaryLabel ?? t("wizard.stepPage.defaultPrimary")}
        onPrimary={onContinue}
        secondaryLabel={secondaryLabel ?? t("wizard.stepPage.defaultSecondary")}
        onSecondary={onBack}
      />
    </div>
  );
}
