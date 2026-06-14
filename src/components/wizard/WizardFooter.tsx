"use client";

import { clsx } from "clsx";

type WizardFooterProps = {
  statusText: string;
  statusReady?: boolean;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  leftSlot?: React.ReactNode;
};


export function WizardFooter({
  statusText,
  statusReady,
  primaryLabel,
  onPrimary,
  primaryDisabled,
  secondaryLabel,
  onSecondary,
  leftSlot,
}: WizardFooterProps) {
  return (
    <section className="wizard-footer">
      <div className="wizard-footer-left">
        {onSecondary && secondaryLabel ? (
          <button type="button" className="ghost-button" onClick={onSecondary}>
            {secondaryLabel}
          </button>
        ) : null}
        <div className="wizard-footer-status">
          <span className={clsx("wizard-footer-dot", statusReady && "ready")} />
          <p>{statusText}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {leftSlot}
        <button type="button" className="primary-button" onClick={onPrimary} disabled={primaryDisabled}>
          {primaryLabel}
        </button>
      </div>
    </section>
  );
}
