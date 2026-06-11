"use client";

import { createContext, useCallback, useContext, useState } from "react";

type WizardProgressContextType = {
  completedSteps: Set<number>;
  completeStep: (stepIndex: number) => void;
  isStepAccessible: (stepIndex: number) => boolean;
};

const WizardProgressContext = createContext<WizardProgressContextType | null>(null);

export function WizardProgressProvider({ children }: { children: React.ReactNode }) {
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const completeStep = useCallback((stepIndex: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(stepIndex);
      return next;
    });
  }, []);

  const isStepAccessible = useCallback(
    (stepIndex: number) => {
      if (stepIndex === 0) return true;
      return completedSteps.has(stepIndex - 1);
    },
    [completedSteps],
  );

  return (
    <WizardProgressContext.Provider value={{ completedSteps, completeStep, isStepAccessible }}>
      {children}
    </WizardProgressContext.Provider>
  );
}

export function useWizardProgress() {
  const context = useContext(WizardProgressContext);
  if (!context) {
    throw new Error("useWizardProgress must be used within a WizardProgressProvider");
  }
  return context;
}
