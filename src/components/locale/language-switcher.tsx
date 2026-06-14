"use client";

import { useTranslation } from "react-i18next";
import { setLanguage } from "@/i18n/i18n";

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  const languages = [
    { value: "en", label: t("locale.en") },
  ] as const;

  return (
    <select
      value={i18n.language}
      onChange={(e) => setLanguage(e.target.value)}
      aria-label={t("aria.language")}
      className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-sm text-[var(--color-ink)]"
    >
      {languages.map((lang) => (
        <option key={lang.value} value={lang.value}>
          {lang.label}
        </option>
      ))}
    </select>
  );
}
