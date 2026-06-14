"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

import clsx from "clsx";

import { SettingsDialog } from "@/components/dashboard/SettingsDialog";

const sidebarItems = [
  { href: "/", navKey: "dashboard" },
  { href: "/wizard", navKey: "wizard" },
  { href: "/mapping-templates", navKey: "templates" },
] as const;

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="dashboard-shell-frame">
      <aside className="dashboard-sidebar">
        <div className="dashboard-sidebar-top">
          <Link href="/" className="dashboard-brand">
            <span className="dashboard-brand-mark">L</span>
            <span className="dashboard-brand-text">
              <strong>LinkUp</strong>
              <span>{t("nav.brandTagline")}</span>
            </span>
          </Link>
        </div>

        <nav className="dashboard-nav" aria-label="Primary">
          {sidebarItems.map((item) => {
            const active = item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx("dashboard-nav-item", active && "is-active")}
              >
                <span className="dashboard-nav-icon" aria-hidden="true">
                  {item.navKey === "dashboard" && (
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 3L4 9v12h16V9L12 3z" />
                      <path d="M9 22V12h6v10" />
                    </svg>
                  )}
                  {item.navKey === "wizard" && (
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M4.5 16.5 11 10l2 2L6.5 19H4.5z" />
                      <path d="m11 10 4-4 3 3-4 4" />
                      <path d="M15.5 4.5 19 8" />
                      <path d="M18 13l.8 1.6 1.7.8-1.7.8-.8 1.6-.8-1.6-1.7-.8 1.7-.8z" />
                    </svg>
                  )}

                  {item.navKey === "templates" && (
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
                      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
                      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
                      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
                    </svg>
                  )}

                </span>
                {t(`nav.${item.navKey}`)}
              </Link>
            );
          })}
        </nav>

        <div className="dashboard-sidebar-bottom" aria-label="Dashboard copyright">
          <button
            type="button"
            className="dashboard-nav-item dashboard-settings-nav-item"
            aria-label={t("settings.title")}
            onClick={() => setIsSettingsOpen(true)}
          >
            <span className="dashboard-nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="3.2" />
                <path d="M12 4.5v2.2M12 17.3v2.2M4.5 12h2.2M17.3 12h2.2M6.8 6.8l1.6 1.6M15.6 15.6l1.6 1.6M17.2 6.8l-1.6 1.6M8.4 15.6l-1.6 1.6" />
              </svg>
            </span>
            {t("settings.title")}
          </button>
          <p>{t("dashboard.copyright", { year: String(new Date().getFullYear()) })}</p>
        </div>
      </aside>

      <div className="dashboard-main-shell">
        <header className="dashboard-topbar">
          <div />
        </header>

        <main className="dashboard-content">{children}</main>
      </div>

      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
