"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";

type WizardProgressContextType = {
  completedSteps: Set<number>;
  completeStep: (stepIndex: number) => void;
  isStepAccessible: (stepIndex: number) => boolean;
  resetProgress: () => void;
  activeRunId: string | null;
  setActiveRunId: (runId: string | null) => void;
  activeDraftToken: string | null;
  setActiveDraftToken: (token: string | null) => void;
};

const WizardProgressContext = createContext<WizardProgressContextType | null>(null);
const STORAGE_KEY = "linkup:wizard:completed-steps";
const RUN_ID_KEY = "linkup:wizard:run-id";
const DRAFT_TOKEN_KEY = "linkup:wizard:draft-token";
const listeners = new Set<() => void>();
const EMPTY_STEPS = new Set<number>();

let completedStepsStore = new Set<number>();
let activeRunIdStore: string | null = null;
let activeDraftTokenStore: string | null = null;

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

function readStoredRunId() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(RUN_ID_KEY);
  } catch {
    return null;
  }
}

function writeStoredRunId(runId: string | null) {
  activeRunIdStore = runId;
  if (typeof window !== "undefined") {
    if (runId) {
      window.sessionStorage.setItem(RUN_ID_KEY, runId);
    } else {
      window.sessionStorage.removeItem(RUN_ID_KEY);
    }
  }
  listeners.forEach((listener) => listener());
}

function readStoredDraftToken() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(DRAFT_TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeStoredDraftToken(token: string | null) {
  activeDraftTokenStore = token;
  if (typeof window !== "undefined") {
    if (token) {
      window.sessionStorage.setItem(DRAFT_TOKEN_KEY, token);
    } else {
      window.sessionStorage.removeItem(DRAFT_TOKEN_KEY);
    }
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
  activeRunIdStore = readStoredRunId();
  activeDraftTokenStore = readStoredDraftToken();
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

  const setActiveRunId = useCallback((runId: string | null) => {
    writeStoredRunId(runId);
  }, []);

  const setActiveDraftToken = useCallback((token: string | null) => {
    writeStoredDraftToken(token);
  }, []);

  return (
    <WizardProgressContext.Provider value={{
      completedSteps,
      completeStep,
      isStepAccessible,
      resetProgress,
      activeRunId: activeRunIdStore,
      setActiveRunId,
      activeDraftToken: activeDraftTokenStore,
      setActiveDraftToken,
    }}>
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
