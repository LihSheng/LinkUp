import Link from "next/link";

import { DashboardShell } from "@/components/dashboard/DashboardShell";

const recentProjects = [
  {
    title: "User Profiles",
    detail: "Last synced 2 hours ago",
    status: "98% match",
    progress: 96,
    icon: "user",
  },
  {
    title: "Sales Data",
    detail: "Archive version 2.4",
    status: "Completed",
    progress: 100,
    icon: "chart",
  },
  {
    title: "Customer Feedback",
    detail: "Processing 12,400 rows",
    status: "In progress",
    progress: 42,
    icon: "message",
  },
] as const;

const metrics = [
  { value: "124", label: "Total mappings" },
  { value: "96.4%", label: "AI accuracy" },
  { value: "42 hrs", label: "Time saved" },
] as const;

export default function HomePage() {
  return (
    <DashboardShell>
      <div className="dashboard-page">
        <section className="dashboard-hero">
          <div>
            <p className="dashboard-kicker">LinkUp intelligence workspace</p>
            <h1>Welcome back. Ready to map?</h1>
            <p className="dashboard-lede">
              Your schema alignment pipeline is healthy. Start a new wizard when you need
              a clean, step-by-step matching flow, or jump straight into the matching lab.
            </p>
          </div>
        </section>

        <section className="dashboard-feature-grid">
          <article className="dashboard-primary-card">
            <div className="dashboard-primary-icon" aria-hidden="true">
              <span>+</span>
            </div>
            <p className="dashboard-card-kicker">New mapping</p>
            <h2>Start wizard</h2>
            <p>
              Step 1 begins with schema selection, then moves into workbook upload, mapping,
              and output review.
            </p>
            <div className="dashboard-card-actions">
              <Link href="/wizard/schema" className="primary-button">
                Start wizard
              </Link>
              <Link href="/studio" className="ghost-button">
                Open matching lab
              </Link>
            </div>
          </article>

          <article className="dashboard-metrics-card" aria-label="Workspace metrics">
            <div className="dashboard-metrics">
              {metrics.map((metric) => (
                <div key={metric.label} className="dashboard-metric">
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section-head">
            <div>
              <h2>Recent projects</h2>
              <p>Skeleton data for the future project feed and matching history.</p>
            </div>
            <Link href="/wizard/output" className="dashboard-section-link">
              View all project history
            </Link>
          </div>

          <div className="dashboard-project-grid">
            {recentProjects.map((project) => (
              <article key={project.title} className="dashboard-project-card">
                <div className="dashboard-project-topline">
                  <div className="dashboard-project-icon" aria-hidden="true">
                    {project.icon === "user" ? "⌁" : project.icon === "chart" ? "▣" : "▭"}
                  </div>
                  <span className="dashboard-pill">{project.status}</span>
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
          <p>© 2026 LinkUp Intelligence. Editorial minimalist design.</p>
          <div className="dashboard-footer-links">
            <Link href="/wizard/schema">Schemas</Link>
            <Link href="/wizard/mapping">Mappings</Link>
            <Link href="/wizard/output">History</Link>
          </div>
        </footer>
      </div>
    </DashboardShell>
  );
}
