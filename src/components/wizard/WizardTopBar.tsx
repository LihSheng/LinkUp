"use client";

type WizardTopBarProps = {
  stepNumber: string;
  title: string;
  description: string;
};

export function WizardTopBar({
  stepNumber,
  title,
  description,
}: WizardTopBarProps) {
  return (
    <header className="wizard-topbar">
      <div>
        <p className="dashboard-kicker">{stepNumber}</p>
        <h1>{title}</h1>
        <p className="wizard-topbar-desc">{description}</p>
      </div>
    </header>
  );
}
