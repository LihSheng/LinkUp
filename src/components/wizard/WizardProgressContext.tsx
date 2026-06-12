"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";

type WizardProgressContextType = {
  completedSteps: Set<number>;
  completeStep: (stepIndex: number) => void;
  isStepAccessible: (stepIndex: number) => boolean;
  resetProgress: () => void;
};

const WizardProgressContext = createContext<WizardProgressContextType | null>(null);
const STORAGE_KEY = "linkup:wizard:completed-steps";
const listeners = new Set<() => void>();
const EMPTY_STEPS = new Set<number>();

let completedStepsStore = new Set<number>();

function readStoredSteps() {
  if (typeof window === "undefined") {
    return new Set<number>();
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return new Set<number>();
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return new Set<number>();
    }

    return new Set(
      parsed.filter((value): value is number => typeof value === "number" && Number.isInteger(value)),
    );
  } catch {
    return new Set<number>();
  }
}

function writeStoredSteps(next: Set<number>) {
  completedStepsStore = next;

  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  }

  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return completedStepsStore;
}

function getServerSnapshot() {
  return EMPTY_STEPS;
}

if (typeof window !== "undefined") {
  completedStepsStore = readStoredSteps();
}

export function WizardProgressProvider({ children }: { children: React.ReactNode }) {
  const completedSteps = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const completeStep = useCallback((stepIndex: number) => {
    const next = new Set(completedStepsStore);
    next.add(stepIndex);
    writeStoredSteps(next);
  }, []);

  const isStepAccessible = useCallback(
    (stepIndex: number) => {
      if (stepIndex === 0) return true;
      return completedSteps.has(stepIndex - 1);
    },
    [completedSteps],
  );

  const resetProgress = useCallback(() => {
    writeStoredSteps(new Set<number>());
  }, []);

  return (
    <WizardProgressContext.Provider value={{ completedSteps, completeStep, isStepAccessible, resetProgress }}>
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
