import Link from "next/link";

import { getDashboardData } from "@/lib/dashboard/dashboard.service";
import { serverT } from "@/i18n/server";

export const dynamic = "force-dynamic";

function ProjectIcon({ icon }: { icon: "user" | "chart" | "message" }) {
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

export default async function HomePage() {
  const { metrics, recentRuns, summary } = await getDashboardData();

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <h1>{serverT("dashboard.heroTitle")}</h1>
        <p className="dashboard-lede">
          {serverT("dashboard.heroLedger", { uploads: String(summary.uploadedFiles), runs: String(summary.mappingRuns), outputs: String(summary.generatedOutputs) })}
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
          <h2>{serverT("dashboard.newMapping")}</h2>
          <p>
            {serverT("dashboard.newMappingDesc")}
          </p>
          <Link href="/wizard/schema" className="dashboard-start-wizard">
            {serverT("dashboard.startWizard")}
          </Link>
        </article>

        <article className="dashboard-stats-card" aria-label={serverT("dashboard.metricsAriaLabel")}>
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
          <h2>{serverT("dashboard.activeMappings")}</h2>
          <Link href="/wizard/output" className="dashboard-section-link">
            {serverT("dashboard.viewHistory")}
          </Link>
        </div>

        <div className="dashboard-project-grid">
          {recentRuns.map((project) => (
            <article key={project.id} className="dashboard-project-card">
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
    </div>
  );
}
