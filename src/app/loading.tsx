import { serverT } from "@/i18n/server";

export default function RootLoading() {
  return (
    <div className="dashboard-shell-frame">
      <div className="dashboard-content" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <p>{serverT("dashboard.loading")}</p>
      </div>
    </div>
  );
}
