export type Appearance = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "linkup-settings";

function isAppearance(value: unknown): value is Appearance {
  return value === "light" || value === "dark" || value === "system";
}

export function getStoredAppearance(): Appearance | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { general?: { appearance?: unknown } };
    const appearance = parsed.general?.appearance;
    return isAppearance(appearance) ? appearance : null;
  } catch {
    return null;
  }
}

export function resolveAppearanceTheme(
  appearance: Appearance,
  prefersDark?: boolean
): ResolvedTheme {
  const prefersDarkMode =
    prefersDark ?? (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  if (appearance === "dark") return "dark";
  if (appearance === "light") return "light";

  return prefersDarkMode ? "dark" : "light";
}

export function applyTheme(theme: ResolvedTheme): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function applyAppearance(appearance: Appearance): void {
  if (typeof window === "undefined") return;

  applyTheme(resolveAppearanceTheme(appearance));
}
