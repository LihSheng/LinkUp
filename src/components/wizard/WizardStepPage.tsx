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
  primaryLabel = "Next",
  secondaryLabel = "Back",
  stats,
  children,
  onContinue,
  onBack,
}: WizardStepPageProps) {
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
          <p className="dashboard-card-kicker">Skeleton note</p>
          <p>{note}</p>
        </div>

        <div className="wizard-panel-body">{children}</div>
      </section>

      <WizardFooter
        statusText={statusText}
        statusReady={statusReady}
        primaryLabel={primaryLabel}
        onPrimary={onContinue}
        secondaryLabel={secondaryLabel}
        onSecondary={onBack}
      />
    </div>
  );
}
