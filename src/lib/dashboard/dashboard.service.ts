import { prisma } from "@/lib/prisma";

type DashboardMetric = {
  value: string;
  unit?: string;
  label: string;
};

type DashboardProject = {
  id: string;
  title: string;
  detail: string;
  badge: string;
  progress: number;
  icon: "user" | "chart" | "message";
};

type DashboardData = {
  metrics: DashboardMetric[];
  recentRuns: DashboardProject[];
  summary: {
    schemaTemplates: number;
    uploadedFiles: number;
    mappingRuns: number;
    mappingTemplates: number;
    generatedOutputs: number;
    completedOutputs: number;
    validOutputs: number;
    rowsProcessed: number;
    avgConfidence: number;
  };
};

function formatPercent(value: number) {
  return `${value.toFixed(1).replace(/\.0$/, "")}%`;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getProgress(status: string) {
  switch (status) {
    case "completed":
    case "completed_with_errors":
      return 100;
    case "suggested":
      return 72;
    case "profiled":
      return 48;
    default:
      return 18;
  }
}

function getBadge(status: string) {
  switch (status) {
    case "completed":
      return "COMPLETED";
    case "completed_with_errors":
      return "WITH ERRORS";
    case "suggested":
      return "SUGGESTED";
    case "profiled":
      return "PROFILED";
    default:
      return status.toUpperCase();
  }
}

function getTitle(run: {
  displayName: string | null;
  sourceSheetName: string | null;
  uploadedFile: { originalName: string } | null;
}) {
  const displayName = run.displayName?.trim();
  if (displayName && /[a-zA-Z]/.test(displayName)) {
    return displayName;
  }

  if (run.uploadedFile?.originalName.trim()) {
    return run.uploadedFile.originalName.replace(/\.[^.]+$/, "");
  }

  if (run.sourceSheetName?.trim()) {
    return run.sourceSheetName.trim();
  }

  return "Untitled run";
}

export async function getDashboardData(): Promise<DashboardData> {
  const [schemaTemplates, uploadedFiles, mappingRuns, mappingTemplates, generatedOutputs, runs, outputs] =
    await Promise.all([
      prisma.schemaTemplate.count(),
      prisma.uploadedFile.count(),
      prisma.mappingRun.count(),
      prisma.mappingTemplate.count(),
      prisma.generatedOutput.count(),
      prisma.mappingRun.findMany({
        where: {
          status: {
            in: ["profiled", "suggested", "completed", "completed_with_errors"],
          },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          displayName: true,
          status: true,
          createdAt: true,
          sourceSheetName: true,
          columnProfiles: true,
          sampleRows: true,
          output: {
            select: {
              jsonOutput: true,
              errors: true,
            },
          },
          uploadedFile: {
            select: {
              originalName: true,
            },
          },
        },
      }),
      prisma.generatedOutput.findMany({
        select: {
          jsonOutput: true,
        },
      }),
    ]);

  const confirmedMappings = await prisma.mappingRun.findMany({
    select: {
      confirmedMapping: true,
    },
  });

  let confirmedMappingCount = 0;
  let confidenceSum = 0;
  let confidenceCount = 0;
  let rowsProcessed = 0;
  let validOutputs = 0;

  for (const run of confirmedMappings) {
    const mappings =
      run.confirmedMapping && typeof run.confirmedMapping === "object" && "mappings" in run.confirmedMapping
        ? (run.confirmedMapping as { mappings?: Array<{ confidence?: number }> }).mappings ?? []
        : [];

    confirmedMappingCount += mappings.length;

    for (const mapping of mappings) {
      if (typeof mapping.confidence === "number") {
        confidenceSum += mapping.confidence;
        confidenceCount += 1;
      }
    }
  }

  for (const output of outputs) {
    if (Array.isArray(output.jsonOutput)) {
      rowsProcessed += output.jsonOutput.length;
    }
  }

  validOutputs = runs.filter((run) => run.status === "completed").length;

  const avgConfidence = confidenceCount > 0 ? (confidenceSum / confidenceCount) * 100 : 0;
  const metrics: DashboardMetric[] = [
    {
      value: formatCount(confirmedMappingCount),
      label: "CONFIRMED MAPPINGS",
    },
    {
      value: formatPercent(avgConfidence),
      label: "AVG CONFIDENCE",
    },
    {
      value: formatCount(rowsProcessed),
      unit: "rows",
      label: "ROWS PROCESSED",
    },
  ];

  const recentRuns: DashboardProject[] = runs.map((run) => {
    const outputRows = Array.isArray(run.output?.jsonOutput) ? run.output.jsonOutput.length : 0;
    const sampleRows = Array.isArray(run.sampleRows) ? run.sampleRows.length : 0;
    const columnCount = Array.isArray(run.columnProfiles) ? run.columnProfiles.length : 0;
    const rowCount = outputRows > 0 ? outputRows : sampleRows;
    const title = getTitle(run);
    const sheetName = run.sourceSheetName?.trim();
    const detailParts = [
      sheetName && sheetName !== title ? sheetName : null,
      rowCount > 0 ? `${formatCount(rowCount)} rows` : `${formatCount(columnCount)} columns`,
      formatDate(run.createdAt),
    ].filter(Boolean);

    return {
      id: `${run.createdAt.toISOString()}-${title}`,
      title,
      detail: detailParts.join(" · "),
      badge: getBadge(run.status),
      progress: getProgress(run.status),
      icon:
        rowCount > 0
          ? "chart"
          : columnCount > 0
            ? "user"
            : "message",
    };
  });

  return {
    metrics,
    recentRuns,
    summary: {
      schemaTemplates,
      uploadedFiles,
      mappingRuns,
      mappingTemplates,
      generatedOutputs,
      completedOutputs: runs.filter((run) => run.status === "completed" || run.status === "completed_with_errors").length,
      validOutputs,
      rowsProcessed,
      avgConfidence,
    },
  };
}
