"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import clsx from "clsx";

type NavItem = {
  href: string;
  label: string;
};

const navItems: NavItem[] = [
  { href: "/", label: "Projects" },
  { href: "/wizard/schema", label: "Schemas" },
  { href: "/wizard/mapping", label: "Mappings" },
  { href: "/wizard/output", label: "History" },
];

function IconButton({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className="dashboard-icon-button" aria-label={label}>
      {children}
    </button>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="workspace-shell dashboard-shell-frame">
      <aside className="dashboard-sidebar">
        <Link href="/" className="dashboard-brand">
          <span className="dashboard-brand-mark">L</span>
          <span>
            <strong>LinkUp</strong>
            <span>Schema intelligence</span>
          </span>
        </Link>

        <nav className="dashboard-nav" aria-label="Primary">
          {navItems.map((item) => {
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
                  {item.href === "/" ? "◫" : item.label.slice(0, 1)}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="dashboard-sidebar-card">
          <p className="dashboard-card-kicker">Quick upload</p>
          <p>Start with the schema step and move through the wizard in order.</p>
          <Link href="/wizard/schema" className="primary-button dashboard-sidebar-cta">
            Open wizard
          </Link>
        </div>

        <div className="dashboard-sidebar-links">
          <Link href="/studio" className="dashboard-sidebar-link">
            Matching lab
          </Link>
          <button type="button" className="dashboard-sidebar-link">
            Support
          </button>
          <button type="button" className="dashboard-sidebar-link">
            Sign out
          </button>
        </div>
      </aside>

      <div className="dashboard-main-shell">
        <header className="dashboard-topbar">
          <label className="dashboard-search">
            <span aria-hidden="true">⌕</span>
            <input type="search" placeholder="Search mappings..." aria-label="Search mappings" />
          </label>

          <nav className="dashboard-topnav" aria-label="Sections">
            {navItems.map((item) => {
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
            <IconButton label="Notifications">⌘</IconButton>
            <IconButton label="Settings">⚙</IconButton>
            <div className="dashboard-avatar" aria-label="Workspace avatar">
              L
            </div>
          </div>
        </header>

        <main className="dashboard-content">{children}</main>
      </div>
    </div>
  );
}
