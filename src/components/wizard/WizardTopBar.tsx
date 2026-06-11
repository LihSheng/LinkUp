"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

type WizardTopBarProps = {
  stepNumber: string;
  title: string;
  description: string;
  requireBackConfirmation?: boolean;
};

export function WizardTopBar({
  stepNumber,
  title,
  description,
  requireBackConfirmation,
}: WizardTopBarProps) {
  const router = useRouter();
  const [showBackConfirm, setShowBackConfirm] = useState(false);

  return (
    <header className="wizard-topbar">
      <div>
        <p className="dashboard-kicker">{stepNumber}</p>
        <h1>{title}</h1>
        <p className="wizard-topbar-desc">{description}</p>
      </div>
      <div className="wizard-topbar-actions">
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
    </header>
  );
}
