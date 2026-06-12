"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Sparkles } from "lucide-react";
import clsx from "clsx";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
  classifyConfidence,
  getConfidenceLabel,
  getProcessingLabel,
  getRemainingSeconds,
  type WorkbenchState,
} from "./schema-matching-workbench.helpers";

type LogLevel = "info" | "success" | "warning";

type LogEntry = {
  id: number;
  message: string;
  level: LogLevel;
  highlight?: string;
};

type SourceField = {
  name: string;
};

type TargetField = {
  name: string;
  type: string;
  required: boolean;
};

type Mapping = {
  source: SourceField;
  target: TargetField;
  confidence: number;
};

const SAMPLE_MAPPINGS: Mapping[] = [
  {
    source: { name: "First_Name" },
    target: { name: "firstName", type: "string", required: true },
    confidence: 98,
  },
  {
    source: { name: "Email_Address" },
    target: { name: "email", type: "string", required: true },
    confidence: 95,
  },
  {
    source: { name: "Home_Phone_Number" },
    target: { name: "phone", type: "string", required: false },
    confidence: 91,
  },
];

type QueuedLog = {
  delay: number;
  message: string;
  level: LogLevel;
  highlight?: string;
  onState?: WorkbenchState;
};

const LOG_TIMELINE: QueuedLog[] = [
  { delay: 800, message: "Analyzing uploaded file...", level: "info" },
  { delay: 2200, message: "Reading field names and sample values...", level: "info" },
  { delay: 4200, message: "Comparing with template fields...", level: "info", onState: "confidence-updating" },
  { delay: 5600, message: "Mapping First_Name -> firstName", level: "info", highlight: "98% matched" },
  { delay: 6800, message: "Mapping Email_Address -> email", level: "info", highlight: "95% matched" },
  { delay: 8200, message: "Checking matching confidence...", level: "info" },
  {
    delay: 9600,
    message: "Some fields need deeper analysis. Enhancing with AI...",
    level: "warning",
    onState: "validation-running",
  },
  { delay: 12800, message: "AI matching completed. Please review the result.", level: "success", onState: "ready-for-review" },
];

function formatTime(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

type SchemaMappingWorkbenchProps = {
  onBack?: () => void;
  onComplete?: () => void;
};

export function SchemaMappingWorkbench({ onBack, onComplete }: SchemaMappingWorkbenchProps) {
  const [processingState, setProcessingState] = useState<WorkbenchState>("analyzing");
  const [entries, setEntries] = useState<LogEntry[]>([
    { id: 0, message: "Initializing AI-assisted matching...", level: "info" },
  ]);
  const [elapsed, setElapsed] = useState(0);
  const [baseTime] = useState(() => Date.now());
  const nextId = useRef(1);
  const startRef = useRef<number | null>(null);
  const processedRef = useRef(new Set<number>());
  const completionDoneRef = useRef(false);
  const liveFeedRef = useRef<HTMLDivElement>(null);
  const [mappings] = useState<Mapping[]>(SAMPLE_MAPPINGS);

  useEffect(() => {
    startRef.current = Date.now();
    let cancelled = false;

    const tick = () => {
      if (cancelled || startRef.current === null) {
        return;
      }

      const elapsedMs = Date.now() - startRef.current;
      setElapsed(Math.floor(elapsedMs / 1000));

      for (let i = 0; i < LOG_TIMELINE.length; i++) {
        if (processedRef.current.has(i)) continue;
        if (elapsedMs < LOG_TIMELINE[i].delay) continue;

        processedRef.current.add(i);
        const entry = LOG_TIMELINE[i];

        setEntries((current) => [
          ...current,
          {
            id: nextId.current++,
            message: entry.message,
            level: entry.level,
            highlight: entry.highlight,
          },
        ]);

        if (entry.onState) {
          setProcessingState(entry.onState);
        }
      }

      requestAnimationFrame(tick);
    };

    const raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, []);

  const handleBack = useCallback(() => {
    onBack?.();
  }, [onBack]);

  const handleContinue = useCallback(() => {
    if (processingState !== "ready-for-review") {
      return;
    }

    if (completionDoneRef.current) {
      return;
    }

    completionDoneRef.current = true;
    onComplete?.();
  }, [onComplete, processingState]);

  useEffect(() => {
    if (liveFeedRef.current) {
      const viewport = liveFeedRef.current.parentElement;
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [entries]);

  const stateLabel = getProcessingLabel(processingState);
  const isReady = processingState === "ready-for-review";
  const isFailed = processingState === "failed";
  const progressPercent = Math.min(100, Math.round((elapsed / 18) * 100));
  const remainingSeconds = getRemainingSeconds(elapsed);

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-[1200px] flex-1 flex-col gap-8 px-1">
      {isFailed ? (
        <div className="rounded-xl border border-[rgba(186,26,26,0.18)] bg-[rgba(186,26,26,0.06)] px-4 py-3 text-[0.9rem] text-[var(--color-error)]">
          AI matching could not complete. Please review the source file and try again.
        </div>
      ) : null}

      <div className="flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[rgba(252,251,248,0.9)]">
        <div className="flex flex-col items-center px-10 pb-8 pt-10 text-center">
          <h3 className="m-0 font-[var(--font-display)] text-[clamp(2.8rem,4.6vw,4rem)] font-semibold tracking-[-0.07rem] text-[var(--color-ink)]">
            Mapping Intelligence
          </h3>
          <p className="m-0 mt-4 max-w-[42ch] text-[1rem] leading-relaxed text-[var(--color-muted)]">
            Our AI is matching your column headers to the target schema with semantic precision.
          </p>
        </div>

        <div className="mx-6 mb-2 mt-1 overflow-hidden rounded-[14px] border border-[var(--color-border)] bg-[rgba(247,244,237,0.55)] px-6 py-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col gap-4">
            {mappings.map((mapping) => {
              const band = classifyConfidence(mapping.confidence);
              const bandLabel = getConfidenceLabel(band);

              return (
                <div
                  key={`${mapping.source.name}-${mapping.target.name}`}
                  className="grid gap-3 md:grid-cols-[minmax(0,1fr)_96px_minmax(0,1fr)] md:items-center"
                >
                  <div className="rounded-lg border border-[var(--color-border)] bg-[rgba(252,251,248,0.86)] px-4 py-4 text-left">
                    <div className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                      Source
                    </div>
                    <div className="mt-1 font-[var(--font-mono)] text-[1rem] text-[var(--color-ink)]">
                      {mapping.source.name}
                    </div>
                  </div>

                  <div className="relative flex min-h-[88px] items-center justify-center">
                    <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-[rgba(28,28,28,0.12)] md:block" />
                    <div className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[rgba(252,251,248,0.9)] shadow-sm">
                      <Sparkles className="h-4 w-4 text-[var(--color-ink)] opacity-70" />
                    </div>
                    <span className="absolute bottom-1 rounded-full border border-[var(--color-border)] bg-[rgba(252,251,248,0.92)] px-2.5 py-0.5 font-[var(--font-mono)] text-[0.68rem] text-[var(--color-muted)] md:bottom-auto md:top-full md:mt-1">
                      {mapping.confidence}% {bandLabel}
                    </span>
                  </div>

                  <div className="rounded-lg border border-[var(--color-border)] bg-[rgba(247,244,237,0.68)] px-4 py-4 text-left">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                          Target Schema
                        </div>
                        <div className="mt-1 font-[var(--font-mono)] text-[1rem] text-[var(--color-ink)]">
                          {mapping.target.name}
                        </div>
                      </div>
                      <span
                        className={clsx(
                          "shrink-0 rounded-full border px-2.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.08em]",
                          band === "matched" &&
                            "border-[rgba(21,128,61,0.18)] bg-[rgba(21,128,61,0.08)] text-[var(--color-success)]",
                          band === "review-needed" &&
                            "border-[rgba(146,64,14,0.18)] bg-[rgba(146,64,14,0.08)] text-[var(--color-warning)]",
                          band === "unmatched" &&
                            "border-[rgba(186,26,26,0.18)] bg-[rgba(186,26,26,0.08)] text-[var(--color-error)]",
                        )}
                      >
                        {bandLabel}
                      </span>
                    </div>
                    <div className="mt-2 text-[0.7rem] text-[var(--color-muted)]">
                      {mapping.target.type}
                      {mapping.target.required ? " · required" : " · optional"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6">
            <div className="h-1 overflow-hidden rounded-full bg-[var(--color-ink-06)]">
              <div
                className={clsx(
                  "h-full rounded-full transition-all duration-500 ease-out",
                  isReady ? "bg-[var(--color-success)]" : "bg-[var(--color-ink-40)]",
                  !isReady && "animate-shimmer",
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="mt-1.5 text-[0.72rem] text-[var(--color-muted)]">{stateLabel}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[rgba(252,251,248,0.9)]">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="text-[0.82rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink)]">
              Live Activity
            </span>
            <span
              className={clsx(
                "block h-2 w-2 rounded-full",
                isReady ? "bg-[var(--color-success)]" : "bg-[var(--color-error)] animate-pulse",
              )}
            />
          </div>
          <span className="text-[0.8rem] text-[var(--color-muted)]">Live Feed</span>
        </div>

        <ScrollArea className="max-h-[230px]">
          <div ref={liveFeedRef} className="flex flex-col gap-0 px-6 py-4">
            {entries.map((entry, index) => (
              <div
                key={entry.id}
                className={clsx(
                  "flex items-start gap-3 py-1.5 text-[0.8rem] leading-relaxed",
                  entry.level === "success" && "text-[var(--color-success)]",
                  entry.level === "warning" && "text-[var(--color-warning)]",
                  entry.level === "info" && "text-[var(--color-ink-82)]",
                )}
              >
                <span className="shrink-0 font-[var(--font-mono)] text-[0.68rem] text-[var(--color-ink-40)]">
                  {formatTime(new Date(baseTime + index * 800))}
                </span>
                <span className="min-w-0">
                  {entry.message}
                  {entry.highlight ? (
                    <span className="ml-1.5 inline-block rounded-full border border-[var(--color-border)] bg-[rgba(28,28,28,0.04)] px-2 py-0.5 text-[0.68rem] font-semibold text-[var(--color-ink)]">
                      {entry.highlight}
                    </span>
                  ) : null}
                </span>
              </div>
            ))}
            {!isReady ? (
              <div className="flex items-center gap-3 py-1.5 text-[0.75rem] italic text-[var(--color-muted)]">
                <span className="shrink-0 font-[var(--font-mono)] text-[0.68rem] text-[var(--color-ink-40)]">
                  {formatTime(new Date(baseTime + elapsed * 1000))}
                </span>
                <span>Processing next step...</span>
              </div>
            ) : null}
          </div>
        </ScrollArea>
      </div>

        <div className="mt-auto flex flex-col items-center justify-between gap-4 border-t border-[var(--color-border)] pt-5 sm:flex-row">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-transparent px-3.5 text-[0.84rem] font-medium text-[var(--color-ink)] transition-all hover:bg-[var(--color-ink-04)] active:translate-y-px"
              onClick={handleBack}
            >
              Back
          </button>

          <div className="flex items-center gap-2">
            <span
              className={clsx(
                "block h-2 w-2 rounded-full",
                isReady ? "bg-[var(--color-success)]" : "bg-[var(--color-ink-40)] animate-pulse",
              )}
            />
            <span className="text-[0.8rem] text-[var(--color-muted)]">
              {isReady ? "Ready for review" : `AI matching in progress - ~${remainingSeconds}s remaining`}
            </span>
          </div>
        </div>

        <button
          type="button"
          disabled={!isReady}
          className={clsx(
            "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-5 text-[0.84rem] font-medium transition-all",
            isReady
              ? "bg-[var(--color-ink)] text-[var(--color-cream-soft)] shadow-[var(--shadow-button-inset)] hover:opacity-80 active:translate-y-px"
              : "cursor-not-allowed bg-[var(--color-ink-06)] text-[var(--color-ink-40)]",
          )}
          onClick={handleContinue}
          aria-disabled={!isReady}
        >
          {isReady ? "Continue" : "Processing..."}
        </button>
      </div>
    </div>
  );
}
