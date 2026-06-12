"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import clsx from "clsx";

import { SettingsDialog } from "@/components/dashboard/SettingsDialog";

const sidebarItems = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/wizard", label: "Wizard", icon: "wizard" },
  { href: "/wizard/schema", label: "Active Schemas", icon: "schema" },
  { href: "/wizard/mapping", label: "Mapping Tools", icon: "mapping" },
] as const;

const topNavItems = [
  { href: "/", label: "Projects" },
  { href: "/wizard/schema", label: "Schemas" },
  { href: "/wizard/mapping", label: "Mappings" },
  { href: "/wizard/output", label: "History" },
] as const;

export function DashboardShell({ children }: { children: React.ReactNode }) {
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
              <span>SCHEMA INTELLIGENCE</span>
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
                  {item.icon === "dashboard" && (
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
                      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
                      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
                      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
                    </svg>
                  )}
                  {item.icon === "wizard" && (
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M4.5 16.5 11 10l2 2L6.5 19H4.5z" />
                      <path d="m11 10 4-4 3 3-4 4" />
                      <path d="M15.5 4.5 19 8" />
                      <path d="M18 13l.8 1.6 1.7.8-1.7.8-.8 1.6-.8-1.6-1.7-.8 1.7-.8z" />
                    </svg>
                  )}
                  {item.icon === "schema" && (
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M6 6.5h12M6 12h8M6 17.5h12" />
                      <rect x="3.5" y="4.5" width="3" height="3" rx="0.75" />
                      <rect x="3.5" y="10.5" width="3" height="3" rx="0.75" />
                      <rect x="3.5" y="16.5" width="3" height="3" rx="0.75" />
                    </svg>
                  )}
                  {item.icon === "mapping" && (
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M5 7h6M13 17h6M11 7v10M17 7v10" />
                      <circle cx="5" cy="7" r="1.5" />
                      <circle cx="19" cy="17" r="1.5" />
                      <circle cx="11" cy="12" r="1.5" />
                      <circle cx="17" cy="12" r="1.5" />
                    </svg>
                  )}

                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="dashboard-sidebar-bottom">
          <Link href="/wizard/schema" className="dashboard-quick-upload">
            Quick Upload
          </Link>
        </div>
      </aside>

      <div className="dashboard-main-shell">
        <header className="dashboard-topbar">
          <label className="dashboard-search">
            <span aria-hidden="true" className="dashboard-search-icon">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" />
                <path d="M16 16l4 4" />
              </svg>
            </span>
            <input type="search" placeholder="Search mappings..." aria-label="Search mappings" />
          </label>

          <nav className="dashboard-topnav" aria-label="Sections">
            {topNavItems.map((item) => {
              const active = item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx("dashboard-topnav-link", active && "is-active")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="dashboard-utility">
            <button
              type="button"
              className="dashboard-settings-btn"
              aria-label="Settings"
              onClick={() => setIsSettingsOpen(true)}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="3.2" />
                <path d="M12 4.5v2.2M12 17.3v2.2M4.5 12h2.2M17.3 12h2.2M6.8 6.8l1.6 1.6M15.6 15.6l1.6 1.6M17.2 6.8l-1.6 1.6M8.4 15.6l-1.6 1.6" />
              </svg>
            </button>
          </div>
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
