"use client";

import { type ReactNode, useEffect } from "react";
import {
  applyTheme,
  getStoredAppearance,
  resolveAppearanceTheme,
  THEME_STORAGE_KEY,
} from "@/lib/theme";

function syncTheme(): void {
  const appearance = getStoredAppearance() ?? "system";
  applyTheme(resolveAppearanceTheme(appearance));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    syncTheme();

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) {
        syncTheme();
      }
    };
    const handleMediaChange = () => {
      const appearance = getStoredAppearance() ?? "system";
      if (appearance === "system") {
        syncTheme();
      }
    };

    window.addEventListener("storage", handleStorage);
    media.addEventListener("change", handleMediaChange);

    return () => {
      window.removeEventListener("storage", handleStorage);
      media.removeEventListener("change", handleMediaChange);
    };
  }, []);

  return <>{children}</>;
}
