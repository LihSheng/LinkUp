import type { Metadata } from "next";
import dynamic from "next/dynamic";

const SchemaMatcherWorkbench = dynamic(
  () =>
    import("@/components/SchemaMatcherWorkbench").then(
      (mod) => mod.SchemaMatcherWorkbench,
    ),
  {
    loading: () => (
      <div className="workspace-shell">
        <div className="surface-card" style={{ padding: "2rem", textAlign: "center" }}>
          <p>Loading workbench…</p>
        </div>
      </div>
    ),
  },
);

export const metadata: Metadata = {
  title: "Matching Lab",
  description: "The original all-in-one schema matching workbench for LinkUp.",
};

export default function StudioPage() {
  return <SchemaMatcherWorkbench />;
}
