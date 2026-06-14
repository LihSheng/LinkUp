"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";

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
  { href: "/wizard/schema", key: "schema" },
  { href: "/wizard/workbook", key: "workbook" },
  { href: "/wizard/mapping", key: "mapping" },
  { href: "/wizard/output", key: "output" },
] as const;

export function WizardShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
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
            <span>{t("nav.wizardTagline")}</span>
          </span>
        </Link>

        <nav className="wizard-step-nav" aria-label="Wizard steps">
          {steps.map((step, index) => {
            const active = pathname === step.href;
            const accessible = isStepAccessible(index);
            const stepKey = `wizard.shell.steps.${step.key}`;

            if (!accessible) {
              return (
                <span
                  key={step.href}
                  className={clsx("wizard-step-item", "is-disabled")}
                  aria-disabled="true"
                >
                  <span className="wizard-step-number">{t(`${stepKey}.number`)}</span>
                  <span>
                    <strong>{t(`${stepKey}.label`)}</strong>
                    <span>{t(`${stepKey}.subtitle`)}</span>
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
                <span className="wizard-step-number">{t(`${stepKey}.number`)}</span>
                <span>
                  <strong>{t(`${stepKey}.label`)}</strong>
                  <span>{t(`${stepKey}.subtitle`)}</span>
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
              {t("nav.backToDashboard")}
            </button>
          ) : (
            <Link href="/" className="ghost-button">
              {t("nav.backToDashboard")}
            </Link>
          )}
        </div>
      </aside>

      <AlertDialog open={showBackConfirm} onOpenChange={setShowBackConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("wizard.shell.leave.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("wizard.shell.leave.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("wizard.shell.leave.stay")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push("/")}>
              {t("wizard.shell.leave.leave")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="wizard-main-shell">
        {showSharedTopBar ? (
          <WizardTopBar
            stepNumber={`${t("wizard.shell.stepPrefix")} ${t(`wizard.shell.steps.${activeStep.key}.number`)}`}
            title={t(`wizard.shell.steps.${activeStep.key}.title`)}
            description={t(`wizard.shell.steps.${activeStep.key}.description`)}
          />
        ) : null}
        <main className="wizard-content">{children}</main>
      </div>
    </div>
  );
}
