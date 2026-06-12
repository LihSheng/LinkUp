export default function DashboardLoading() {
  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <div className="h-4 w-24 animate-pulse rounded-full bg-[var(--dashboard-panel-border)]" />
        <div className="mt-3 h-8 w-64 animate-pulse rounded-lg bg-[var(--dashboard-panel-border)]" />
        <div className="mt-2 h-4 w-96 animate-pulse rounded-full bg-[var(--dashboard-panel-border)]" />
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-2xl border border-[var(--dashboard-panel-border)] bg-[var(--dashboard-panel-bg)] p-5"
          >
            <div className="h-3 w-20 rounded-full bg-[var(--dashboard-panel-border)]" />
            <div className="mt-3 h-8 w-16 rounded-lg bg-[var(--dashboard-panel-border)]" />
          </div>
        ))}
      </section>

      <section className="dashboard-section mt-6">
        <div className="h-6 w-40 animate-pulse rounded-lg bg-[var(--dashboard-panel-border)]" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-2xl border border-[var(--dashboard-panel-border)] bg-[var(--dashboard-panel-bg)]"
            />
          ))}
        </div>
      </section>
    </div>
  );
}
