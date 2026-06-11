"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  AlertTriangle,
} from "lucide-react";

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
  { id: "general", label: "General", icon: Settings2 },
  { id: "model", label: "Model Settings", icon: Cpu },
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "zh", label: "Chinese" },
  { value: "ja", label: "Japanese" },
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
  { value: "gpt-4o", label: "GPT-4o", provider: "openai" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini", provider: "openai" },
  { value: "claude-3.5-sonnet", label: "Claude 3.5 Sonnet", provider: "anthropic" },
  { value: "claude-3.5-haiku", label: "Claude 3.5 Haiku", provider: "anthropic" },
  { value: "gemini-2.0-pro", label: "Gemini 2.0 Pro", provider: "google" },
];

const PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google" },
];

const RESPONSE_LENGTHS: { value: ResponseLength; label: string; desc: string }[] = [
  { value: "concise", label: "Concise", desc: "Short, direct responses" },
  { value: "balanced", label: "Balanced", desc: "Moderate detail" },
  { value: "detailed", label: "Detailed", desc: "Comprehensive answers" },
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
          "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
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

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const [savedSettings, setSavedSettings] = useState<Settings>(loadSettings);
  const [stagedSettings, setStagedSettings] = useState<Settings>(savedSettings);
  const [activeSection, setActiveSection] = useState<SectionId>("general");
  const [pendingClose, setPendingClose] = useState(false);

  const isDirty = useMemo(
    () => JSON.stringify(stagedSettings) !== JSON.stringify(savedSettings),
    [stagedSettings, savedSettings]
  );

  const handleRequestClose = useCallback(() => {
    if (isDirty) {
      setPendingClose(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  const handleSave = useCallback(() => {
    persistSettings(stagedSettings);
    setSavedSettings({ ...stagedSettings });
  }, [stagedSettings]);

  const handleDiscard = useCallback(() => {
    setStagedSettings({ ...savedSettings });
  }, [savedSettings]);

  const handleConfirmDiscardAndClose = useCallback(() => {
    setStagedSettings({ ...savedSettings });
    setPendingClose(false);
    onClose();
  }, [savedSettings, onClose]);

  const handleCancelClose = useCallback(() => {
    setPendingClose(false);
  }, []);

  const updateGeneral = useCallback((partial: Partial<GeneralSettings>) => {
    setStagedSettings((prev) => ({
      ...prev,
      general: { ...prev.general, ...partial },
    }));
  }, []);

  const updateModel = useCallback((partial: Partial<ModelSettings>) => {
    setStagedSettings((prev) => ({
      ...prev,
      model: { ...prev.model, ...partial },
    }));
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) handleRequestClose();
    },
    [handleRequestClose]
  );


  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "flex flex-col sm:max-w-[760px] max-w-[calc(100vw-32px)] w-full min-w-[320px] max-h-[min(640px,calc(100vh-48px))] min-h-[400px] p-0 gap-0 overflow-hidden rounded-xl",
          "bg-[var(--color-cream)] text-[var(--color-ink)] ring-[var(--color-border)]"
        )}
      >
        <DialogTitle className="sr-only">Settings</DialogTitle>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0">
          <h2 className="font-heading text-base font-semibold text-[var(--color-ink)]">
            Settings
          </h2>
          <button
            type="button"
            onClick={handleRequestClose}
            aria-label="Close settings"
            className="flex size-7 items-center justify-center rounded-md text-[var(--color-muted)] hover:bg-[var(--color-ink-06)] hover:text-[var(--color-ink)] transition-colors"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        {/* ── Body: sidebar + content ── */}
        <div className="flex flex-1 min-h-0 border-y border-[var(--color-border)]">
          {/* Sidebar */}
          <nav
            aria-label="Settings sections"
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
                  <span className="truncate">{section.label}</span>
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
                      ? "bg-[var(--color-ink)] text-[var(--color-cream-soft)]"
                      : "text-[var(--color-muted)] hover:bg-[var(--color-ink-06)]"
                  )}
                >
                  <Icon className="size-3.5" />
                  {section.label}
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
                    General
                  </h3>
                  <div className="space-y-4">
                    {/* Appearance */}
                    <div className="flex items-center justify-between gap-4">
                      <Label htmlFor="appearance" className="text-sm text-[var(--color-muted)] font-normal">
                        Appearance
                      </Label>
                      <Select
                        value={stagedSettings.general.appearance}
                        onValueChange={(v) => v && updateGeneral({ appearance: v as Appearance })}
                      >
                        <SelectTrigger
                          id="appearance"
                          className="w-[140px] bg-[var(--color-cream-soft)] border-[var(--color-border)]"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Language */}
                    <div className="flex items-center justify-between gap-4">
                      <Label htmlFor="language" className="text-sm text-[var(--color-muted)] font-normal">
                        Language
                      </Label>
                      <Select
                        value={stagedSettings.general.language}
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
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Timezone */}
                    <div className="flex items-center justify-between gap-4">
                      <Label htmlFor="timezone" className="text-sm text-[var(--color-muted)] font-normal">
                        Timezone
                      </Label>
                      <Select
                        value={stagedSettings.general.timezone}
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
                          Automatic workflow sync
                        </Label>
                        <p className="text-xs text-[var(--color-muted)] mt-0.5 opacity-70">
                          Sync mappings automatically as changes are made
                        </p>
                      </div>
                      <Toggle
                        id="auto-sync"
                        checked={stagedSettings.general.autoSync}
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
                    Model Settings
                  </h3>
                  <div className="space-y-4">
                    {/* Provider */}
                    <div className="flex items-center justify-between gap-4">
                      <Label htmlFor="provider" className="text-sm text-[var(--color-muted)] font-normal">
                        Provider
                      </Label>
                      <Select
                        value={stagedSettings.model.provider}
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
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Default Model */}
                    <div className="flex items-center justify-between gap-4">
                      <Label htmlFor="default-model" className="text-sm text-[var(--color-muted)] font-normal">
                        Default model
                      </Label>
                      <Select
                        value={stagedSettings.model.defaultModel}
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
                              disabled={m.provider !== stagedSettings.model.provider}
                            >
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Temperature */}
                    <div className="flex items-center justify-between gap-4">
                      <Label htmlFor="temperature" className="text-sm text-[var(--color-muted)] font-normal">
                        Creativity
                      </Label>
                      <div className="flex items-center gap-3 w-[180px]">
                        <span className="text-xs text-[var(--color-muted)]">Precise</span>
                        <input
                          id="temperature"
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={stagedSettings.model.temperature}
                          onChange={(e) =>
                            updateModel({ temperature: parseFloat(e.target.value) })
                          }
                          className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer bg-[var(--color-border)] accent-[var(--color-ink)]
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--color-ink)] [&::-webkit-slider-thumb]:shadow-[var(--shadow-focus)]
                            [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[var(--color-ink)] [&::-moz-range-thumb]:border-0"
                        />
                        <span className="text-xs text-[var(--color-muted)]">Creative</span>
                      </div>
                    </div>

                    {/* Response Length */}
                    <div>
                      <Label className="text-sm text-[var(--color-muted)] font-normal mb-2 block">
                        Response length
                      </Label>
                      <div className="flex gap-2">
                        {RESPONSE_LENGTHS.map((rl) => (
                          <button
                            key={rl.value}
                            type="button"
                            onClick={() => updateModel({ responseLength: rl.value })}
                            className={cn(
                              "flex-1 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                              stagedSettings.model.responseLength === rl.value
                                ? "border-[var(--color-ink)] bg-[var(--color-ink-06)] text-[var(--color-ink)]"
                                : "border-[var(--color-border)] bg-transparent text-[var(--color-muted)] hover:border-[var(--color-ink-40)] hover:text-[var(--color-ink)]"
                            )}
                          >
                            <span className="font-medium block">{rl.label}</span>
                            <span className="text-xs opacity-70 mt-0.5 block">
                              {rl.desc}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}


          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          {pendingClose ? (
            <>
              <div className="flex items-center gap-2 text-sm text-[var(--color-warning)]">
                <AlertTriangle className="size-4" />
                <span>You have unsaved changes</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelClose}
                >
                  Keep editing
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleConfirmDiscardAndClose}
                  className="bg-[var(--color-error)] text-white hover:opacity-80"
                >
                  Discard changes
                </Button>
              </div>
            </>
          ) : (
            <>
              <div>
                {isDirty && (
                  <span className="text-xs text-[var(--color-muted)]">
                    Unsaved changes
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDiscard}
                  disabled={!isDirty}
                >
                  Discard
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!isDirty}
                  className="bg-[var(--color-ink)] text-[var(--color-cream-soft)] hover:opacity-80 shadow-[var(--shadow-button-inset)]"
                >
                  Save changes
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
