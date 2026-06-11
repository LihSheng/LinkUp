import Link from "next/link";

type WizardStepPageProps = {
  step: string;
  title: string;
  description: string;
  note: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  stats: Array<{ label: string; value: string }>;
  children?: React.ReactNode;
  onContinue?: () => void;
};

export function WizardStepPage({
  step,
  title,
  description,
  note,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  stats,
  children,
  onContinue,
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

      <section className="wizard-footer">
        {onContinue ? (
          <button type="button" className="primary-button" onClick={onContinue}>
            {primaryLabel}
          </button>
        ) : (
          <Link href={primaryHref} className="primary-button">
            {primaryLabel}
          </Link>
        )}
        {secondaryHref && secondaryLabel ? (
          <Link href={secondaryHref} className="ghost-button">
            {secondaryLabel}
          </Link>
        ) : null}
      </section>
    </div>
  );
}
