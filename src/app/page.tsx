import Link from "next/link";

import { DashboardShell } from "@/components/dashboard/DashboardShell";

const recentProjects = [
  {
    title: "User Profiles",
    detail: "Last synced 2 hours ago",
    badge: "98% MATCH",
    progress: 96,
    icon: "user",
  },
  {
    title: "Sales Data",
    detail: "Archive version 2.4",
    badge: "COMPLETED",
    progress: 100,
    icon: "chart",
  },
  {
    title: "Customer Feedback",
    detail: "Processing 12,400 rows...",
    badge: "IN PROGRESS",
    progress: 42,
    icon: "message",
  },
] as const;

const metrics = [
  { value: "124", unit: "", label: "GLOBAL MAPPINGS" },
  { value: "96.4", unit: "%", label: "GLOBAL AI ACCURACY" },
  { value: "42", unit: "hrs", label: "TOTAL TIME SAVED" },
] as const;

function ProjectIcon({ icon }: { icon: (typeof recentProjects)[number]["icon"] }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {icon === "user" && (
        <>
          <circle cx="12" cy="9" r="3" />
          <path d="M6.5 19c.8-3 3-4.5 5.5-4.5S16.2 16 17 19" />
        </>
      )}
      {icon === "chart" && (
        <>
          <path d="M5.5 18.5h13" />
          <rect x="7" y="12.5" width="2.5" height="6" rx="0.5" />
          <rect x="11" y="9" width="2.5" height="9.5" rx="0.5" />
          <rect x="15" y="6.5" width="2.5" height="12" rx="0.5" />
        </>
      )}
      {icon === "message" && (
        <>
          <path d="M5.5 6.5h13v8h-6l-3.5 3v-3h-3.5z" />
          <path d="M8 10h8M8 12.5h5.5" />
        </>
      )}
    </svg>
  );
}

export default function HomePage() {
  return (
    <DashboardShell>
      <div className="dashboard-page">
        <section className="dashboard-hero">
          <h1>Ready to start mapping?</h1>
          <p className="dashboard-lede">
            Our AI engine is standing by to align your schemas.
          </p>
        </section>

        <section className="dashboard-action-row">
          <article className="dashboard-new-mapping-card">
            <div className="dashboard-mapping-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 7v10M7 12h10" />
                <circle cx="12" cy="12" r="7" />
              </svg>
            </div>
            <h2>New Mapping</h2>
            <p>
              Step 1: Select or upload your source template to begin schema alignment.
            </p>
            <Link href="/wizard/schema" className="dashboard-start-wizard">
              Start Wizard &rarr;
            </Link>
          </article>

          <article className="dashboard-stats-card" aria-label="Workspace metrics">
            <div className="dashboard-stats-grid">
              {metrics.map((metric) => (
                <div key={metric.label} className="dashboard-stat">
                  <strong>
                    {metric.value}
                    {metric.unit && (
                      <span className="dashboard-stat-unit">{metric.unit}</span>
                    )}
                  </strong>
                  <span className="dashboard-stat-label">{metric.label}</span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section-head">
            <h2>Active Mappings</h2>
            <Link href="/wizard/output" className="dashboard-section-link">
              View Public History
            </Link>
          </div>

          <div className="dashboard-project-grid">
            {recentProjects.map((project) => (
              <article key={project.title} className="dashboard-project-card">
                <div className="dashboard-project-topline">
                  <div className="dashboard-project-icon" aria-hidden="true">
                    <ProjectIcon icon={project.icon} />
                  </div>
                  <span className="dashboard-pill">{project.badge}</span>
                </div>
                <h3>{project.title}</h3>
                <p>{project.detail}</p>
                <div className="dashboard-progress">
                  <span style={{ width: `${project.progress}%` }} />
                </div>
              </article>
            ))}
          </div>
        </section>

        <footer className="dashboard-footer">
          <p>&#xA9; 2024 LinkUp Intelligence. Editorial Minimalist Design.</p>
          <div className="dashboard-footer-links">
            <Link href="/wizard/schema">Privacy Policy</Link>
            <Link href="/wizard/mapping">Terms of Service</Link>
            <Link href="/wizard/output">API Status</Link>
          </div>
        </footer>
      </div>
    </DashboardShell>
  );
}
