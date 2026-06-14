"use client";

import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  XIcon,
  Settings2,
  Cpu,
  Loader2,
  CheckCircle2,
  XCircle,
  PlugZap,
} from "lucide-react";
import { applyAppearance } from "@/lib/theme";

type Appearance = "light" | "dark" | "system";
type ResponseLength = "concise" | "balanced" | "detailed";

interface GeneralSettings {
  appearance: Appearance;
  language: string;
  timezone: string;
  autoSync: boolean;
}

interface ModelSettings {
  defaultModel: string;
  provider: string;
  temperature: number;
  responseLength: ResponseLength;
}

interface Settings {
  general: GeneralSettings;
  model: ModelSettings;
}

type SectionId = "general" | "model";

interface SidebarSection {
  id: SectionId;
  label: string;
  icon: React.ElementType;
}

const SIDEBAR_SECTIONS: SidebarSection[] = [
  { id: "general", label: "settings.general", icon: Settings2 },
  { id: "model", label: "settings.modelSettings", icon: Cpu },
];

const LANGUAGES = [
  { value: "en", key: "locale.en" },
];

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const MODELS = [
  { value: "gpt-4o", key: "settings.model.modelGpt4o", provider: "openai" },
  { value: "gpt-4o-mini", key: "settings.model.modelGpt4oMini", provider: "openai" },
  { value: "claude-3.5-sonnet", key: "settings.model.modelClaude35Sonnet", provider: "anthropic" },
  { value: "claude-3.5-haiku", key: "settings.model.modelClaude35Haiku", provider: "anthropic" },
  { value: "gemini-2.0-pro", key: "settings.model.modelGemini20Pro", provider: "google" },
];

const PROVIDERS = [
  { value: "openai", key: "settings.model.providerOpenai" },
  { value: "anthropic", key: "settings.model.providerAnthropic" },
  { value: "google", key: "settings.model.providerGoogle" },
];

const RESPONSE_LENGTHS: { value: ResponseLength; labelKey: string; descKey: string }[] = [
  { value: "concise", labelKey: "settings.model.concise", descKey: "settings.model.conciseDesc" },
  { value: "balanced", labelKey: "settings.model.balanced", descKey: "settings.model.balancedDesc" },
  { value: "detailed", labelKey: "settings.model.detailed", descKey: "settings.model.detailedDesc" },
];

const STORAGE_KEY = "linkup-settings";

const DEFAULT_SETTINGS: Settings = {
  general: {
    appearance: "system",
    language: "en",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    autoSync: true,
  },
  model: {
    defaultModel: "gpt-4o",
    provider: "openai",
    temperature: 0.7,
    responseLength: "balanced",
  },
};

function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Settings;
      return {
        general: { ...DEFAULT_SETTINGS.general, ...parsed.general },
        model: { ...DEFAULT_SETTINGS.model, ...parsed.model },
      };
    }
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS;
}

function persistSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

function Toggle({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors",
        checked
          ? "border-[var(--color-ink)] bg-[var(--color-ink)]"
          : "border-[var(--color-border)] bg-[var(--color-border)]"
      )}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 transform rounded-full bg-[var(--color-on-ink)] transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-[3px]"
        )}
      />
    </button>
  );
}

type SettingsDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

type ConnectionTestStatus = "idle" | "testing" | "connected" | "failed";
type ConnectionTestResult = {
  status: ConnectionTestStatus;
  provider?: string;
  model?: string;
  responseTimeMs?: number;
  error?: string;
};

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [activeSection, setActiveSection] = useState<SectionId>("general");
  const [connectionTest, setConnectionTest] = useState<ConnectionTestResult>({
    status: "idle",
  });

  const updateGeneral = useCallback((partial: Partial<GeneralSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, general: { ...prev.general, ...partial } };
      persistSettings(next);
      if (partial.appearance) {
        applyAppearance(next.general.appearance);
      }
      return next;
    });
  }, []);

  const updateModel = useCallback((partial: Partial<ModelSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, model: { ...prev.model, ...partial } };
      persistSettings(next);
      return next;
    });
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onClose();
    },
    [onClose]
  );

  const handleTestConnection = useCallback(async () => {
    setConnectionTest({ status: "testing" });
    try {
      const res = await fetch("/api/settings/test-connection", { method: "POST" });
      const data = await res.json();
      if (data.connected) {
        setConnectionTest({
          status: "connected",
          provider: data.provider,
          model: data.model,
          responseTimeMs: data.responseTimeMs,
        });
      } else {
        setConnectionTest({
          status: "failed",
          provider: data.provider,
          model: data.model,
          responseTimeMs: data.responseTimeMs,
          error: data.error,
        });
      }
    } catch (err) {
      setConnectionTest({
        status: "failed",
        error: err instanceof Error ? err.message : t("settings.model.serverUnreachable"),
      });
    }
  }, [t]);


  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "flex flex-col sm:max-w-[760px] max-w-[calc(100vw-32px)] w-full min-w-[320px] max-h-[min(640px,calc(100vh-48px))] min-h-[400px] p-0 gap-0 overflow-hidden rounded-xl",
          "bg-[var(--color-cream)] text-[var(--color-ink)] ring-[var(--color-border)]"
        )}
      >
        <DialogTitle className="sr-only">{t("settings.title")}</DialogTitle>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0">
          <h2 className="font-heading text-base font-semibold text-[var(--color-ink)]">
            {t("settings.title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("settings.close")}
            className="flex size-7 items-center justify-center rounded-md text-[var(--color-muted)] hover:bg-[var(--color-ink-06)] hover:text-[var(--color-ink)] transition-colors"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        {/* ── Body: sidebar + content ── */}
        <div className="flex flex-1 min-h-0 border-y border-[var(--color-border)]">
          {/* Sidebar */}
          <nav
            aria-label={t("aria.settingsSections")}
            className="hidden sm:flex flex-col w-[200px] shrink-0 border-r border-[var(--color-border)] py-3 overflow-y-auto"
          >
            {SIDEBAR_SECTIONS.map((section) => {
              const isActive = activeSection === section.id;
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "flex items-center gap-2.5 px-4 py-2 text-left text-sm transition-colors cursor-pointer",
                    isActive
                      ? "bg-[var(--color-ink-06)] text-[var(--color-ink)] font-medium"
                      : "text-[var(--color-muted)] hover:bg-[var(--color-ink-04)] hover:text-[var(--color-ink)]"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{t(section.label)}</span>
                </button>
              );
            })}
          </nav>

          {/* Mobile section tabs */}
          <div className="flex sm:hidden gap-1 px-4 py-2 overflow-x-auto border-b border-[var(--color-border)] shrink-0">
            {SIDEBAR_SECTIONS.map((section) => {
              const isActive = activeSection === section.id;
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors",
                      isActive
                      ? "bg-[var(--color-ink)] text-[var(--color-on-ink)]"
                      : "text-[var(--color-muted)] hover:bg-[var(--color-ink-06)]"
                    )}
                >
                  <Icon className="size-3.5" />
                  {t(section.label)}
                </button>
              );
            })}
          </div>

          {/* Content pane */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {activeSection === "general" && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-medium text-[var(--color-ink)] mb-3">
                    {t("settings.general")}
                  </h3>
                  <div className="space-y-4">
                    {/* Appearance */}
                    <div className="flex items-center justify-between gap-4">
                      <Label htmlFor="appearance" className="text-sm text-[var(--color-muted)] font-normal">
                        {t("settings.appearance")}
                      </Label>
                      <Select
                        value={settings.general.appearance}
                        onValueChange={(v) => v && updateGeneral({ appearance: v as Appearance })}
                      >
                        <SelectTrigger
                          id="appearance"
                          className="w-[140px] bg-[var(--color-cream-soft)] border-[var(--color-border)]"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">{t("settings.light")}</SelectItem>
                          <SelectItem value="dark">{t("settings.dark")}</SelectItem>
                          <SelectItem value="system">{t("settings.system")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Language */}
                    <div className="flex items-center justify-between gap-4">
                      <Label htmlFor="language" className="text-sm text-[var(--color-muted)] font-normal">
                        {t("settings.language")}
                      </Label>
                      <Select
                        value={settings.general.language}
                        onValueChange={(v) => v && updateGeneral({ language: v })}
                      >
                        <SelectTrigger
                          id="language"
                          className="w-[140px] bg-[var(--color-cream-soft)] border-[var(--color-border)]"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map((lang) => (
                            <SelectItem key={lang.value} value={lang.value}>
                              {t(lang.key)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Timezone */}
                    <div className="flex items-center justify-between gap-4">
                      <Label htmlFor="timezone" className="text-sm text-[var(--color-muted)] font-normal">
                        {t("settings.timezone")}
                      </Label>
                      <Select
                        value={settings.general.timezone}
                        onValueChange={(v) => v && updateGeneral({ timezone: v })}
                      >
                        <SelectTrigger
                          id="timezone"
                          className="w-[180px] bg-[var(--color-cream-soft)] border-[var(--color-border)]"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIMEZONES.map((tz) => (
                            <SelectItem key={tz} value={tz}>
                              {tz}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Auto Sync */}
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <Label htmlFor="auto-sync" className="text-sm text-[var(--color-muted)] font-normal">
                          {t("settings.autoSync")}
                        </Label>
                        <p className="text-xs text-[var(--color-muted)] mt-0.5 opacity-70">
                          {t("settings.autoSyncDesc")}
                        </p>
                      </div>
                      <Toggle
                        id="auto-sync"
                        checked={settings.general.autoSync}
                        onChange={(v) => updateGeneral({ autoSync: v })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "model" && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-medium text-[var(--color-ink)] mb-3">
                    {t("settings.model.title")}
                  </h3>
                  <div className="space-y-4">
                    {/* Provider */}
                    <div className="flex items-center justify-between gap-4">
                      <Label htmlFor="provider" className="text-sm text-[var(--color-muted)] font-normal">
                        {t("settings.model.provider")}
                      </Label>
                      <Select
                        value={settings.model.provider}
                        onValueChange={(v) => v && updateModel({ provider: v })}
                      >
                        <SelectTrigger
                          id="provider"
                          className="w-[160px] bg-[var(--color-cream-soft)] border-[var(--color-border)]"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PROVIDERS.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {t(p.key)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Default Model */}
                    <div className="flex items-center justify-between gap-4">
                      <Label htmlFor="default-model" className="text-sm text-[var(--color-muted)] font-normal">
                        {t("settings.model.defaultModel")}
                      </Label>
                      <Select
                        value={settings.model.defaultModel}
                        onValueChange={(v) => v && updateModel({ defaultModel: v })}
                      >
                        <SelectTrigger
                          id="default-model"
                          className="w-[180px] bg-[var(--color-cream-soft)] border-[var(--color-border)]"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MODELS.map((m) => (
                            <SelectItem
                              key={m.value}
                              value={m.value}
                              disabled={m.provider !== settings.model.provider}
                            >
                              {t(m.key)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Temperature */}
                    <div className="flex items-center justify-between gap-4">
                      <Label htmlFor="temperature" className="text-sm text-[var(--color-muted)] font-normal">
                        {t("settings.model.creativity")}
                      </Label>
                      <div className="flex items-center gap-3 w-[180px]">
                        <span className="text-xs text-[var(--color-muted)]">{t("settings.model.precise")}</span>
                        <input
                          id="temperature"
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={settings.model.temperature}
                          onChange={(e) =>
                            updateModel({ temperature: parseFloat(e.target.value) })
                          }
                          className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer bg-[var(--color-border)] accent-[var(--color-ink)]
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--color-ink)] [&::-webkit-slider-thumb]:shadow-[var(--shadow-focus)]
                            [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[var(--color-ink)] [&::-moz-range-thumb]:border-0"
                        />
                        <span className="text-xs text-[var(--color-muted)]">{t("settings.model.creative")}</span>
                      </div>
                    </div>

                    {/* Response Length */}
                    <div>
                      <Label className="text-sm text-[var(--color-muted)] font-normal mb-2 block">
                        {t("settings.model.responseLength")}
                      </Label>
                      <div className="flex gap-2">
                          {RESPONSE_LENGTHS.map((rl) => (
                            <button
                              key={rl.value}
                              type="button"
                              onClick={() => updateModel({ responseLength: rl.value })}
                              className={cn(
                                "flex-1 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                                settings.model.responseLength === rl.value
                                  ? "border-[var(--color-ink)] bg-[var(--color-ink-06)] text-[var(--color-ink)]"
                                  : "border-[var(--color-border)] bg-transparent text-[var(--color-muted)] hover:border-[var(--color-ink-40)] hover:text-[var(--color-ink)]"
                              )}
                            >
                              <span className="font-medium block">{t(rl.labelKey)}</span>
                              <span className="text-xs opacity-70 mt-0.5 block">
                                {t(rl.descKey)}
                              </span>
                            </button>
                          ))}
                      </div>
                    </div>

                    {/* Test Connection */}
                    <div className="pt-2 border-t border-[var(--color-border)]">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <span className="text-sm text-[var(--color-muted)] font-normal">
                            {t("settings.model.connectionTest")}
                          </span>
                          <p className="text-xs text-[var(--color-muted)] mt-0.5 opacity-70">
                            {t("settings.model.connectionTestDesc")}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleTestConnection}
                          disabled={connectionTest.status === "testing"}
                          className="gap-1.5 shrink-0"
                        >
                          {connectionTest.status === "testing" ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin" />
                              {t("settings.model.testing")}
                            </>
                          ) : (
                            <>
                              <PlugZap className="size-3.5" />
                              {t("settings.model.testConnection")}
                            </>
                          )}
                        </Button>
                      </div>

                      {connectionTest.status === "connected" && (
                        <div className="mt-3 flex items-start gap-2 rounded-md border border-[rgba(21,128,61,0.18)] bg-[rgba(21,128,61,0.08)] px-3 py-2 text-sm">
                          <CheckCircle2 className="size-4 shrink-0 text-[var(--color-success)] mt-px" />
                          <div>
                            <span className="font-medium text-[var(--color-success)]">
                              {t("settings.model.connected")}
                            </span>
                            <span className="text-[var(--color-muted)] ml-1">
                              {connectionTest.provider} / {connectionTest.model}
                              {connectionTest.responseTimeMs !== undefined &&
                                ` (${connectionTest.responseTimeMs}ms)`}
                            </span>
                          </div>
                        </div>
                      )}

                      {connectionTest.status === "failed" && (
                        <div className="mt-3 flex items-start gap-2 rounded-md border border-[rgba(186,26,26,0.18)] bg-[rgba(186,26,26,0.08)] px-3 py-2 text-sm">
                          <XCircle className="size-4 shrink-0 text-[var(--color-error)] mt-px" />
                          <div>
                            <span className="font-medium text-[var(--color-error)]">
                              {t("settings.model.connectionFailed")}
                            </span>
                            {connectionTest.error && (
                              <span className="text-[var(--color-error)] ml-1">
                                — {connectionTest.error}
                              </span>
                            )}
                            {connectionTest.responseTimeMs !== undefined && (
                              <span className="text-[var(--color-muted)] ml-1">
                                ({connectionTest.responseTimeMs}ms)
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}


          </div>
        </div>


      </DialogContent>
    </Dialog>
  );
}
