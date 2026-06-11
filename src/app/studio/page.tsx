import type { Metadata } from "next";

import { SchemaMatcherWorkbench } from "@/components/SchemaMatcherWorkbench";

export const metadata: Metadata = {
  title: "Matching Lab",
  description: "The original all-in-one schema matching workbench for LinkUp.",
};

export default function StudioPage() {
  return <SchemaMatcherWorkbench />;
}
