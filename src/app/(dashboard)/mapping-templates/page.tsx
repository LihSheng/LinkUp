"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { LayoutGrid, RefreshCcw, Search, Star } from "lucide-react";

import { DataTable } from "@/components/DataTable";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";

type MappingTemplateItem = {
  id: string;
  name: string;
  sourceSignature?: string | null;
  confirmedMapping: unknown;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  schemaTemplate: {
    id: string;
    name: string;
  };
};

type MappingTemplatesResponse = {
  templates: MappingTemplateItem[];
};

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  let data = {} as T & { error?: string };

  if (text) {
    try {
      data = JSON.parse(text) as T & { error?: string };
    } catch {
      if (!response.ok) {
        throw new Error(text);
      }

      throw new Error("Received an invalid JSON response from the server.");
    }
  }

  if (!response.ok) {
    throw new Error(data.error ?? "Request failed.");
  }

  return data;
}

const fetcher = async (url: string) => readJson<MappingTemplatesResponse>(await fetch(url));

function countMappings(mapping: unknown) {
  if (!mapping || typeof mapping !== "object") {
    return 0;
  }

  const entries = (mapping as { mappings?: unknown }).mappings;
  return Array.isArray(entries) ? entries.length : 0;
}

function describeSourceSignature(sourceSignature?: string | null) {
  if (!sourceSignature) {
    return "No source signature saved";
  }

  try {
    const parsed = JSON.parse(sourceSignature) as unknown;
    if (Array.isArray(parsed)) {
      return `${parsed.length} source column profile${parsed.length === 1 ? "" : "s"}`;
    }
    if (parsed && typeof parsed === "object") {
      return `${Object.keys(parsed).length} signature field${Object.keys(parsed).length === 1 ? "" : "s"}`;
    }
  } catch {
  }

  return "Source signature saved";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function MappingTemplatesPage() {
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteLoadingId, setFavoriteLoadingId] = useState<string | null>(null);

  const { data, error, isLoading, mutate } = useSWR<MappingTemplatesResponse>(
    "/api/mapping-templates",
    fetcher,
    { revalidateOnFocus: false },
  );

  const templates = useMemo(() => data?.templates ?? [], [data?.templates]);

  const filteredTemplates = useMemo(() => {
    const term = query.trim().toLowerCase();

    return templates.filter((template) => {
      if (favoritesOnly && !template.isFavorite) {
        return false;
      }

      if (!term) {
        return true;
      }

      return [
        template.name,
        template.schemaTemplate.name,
        template.sourceSignature ?? "",
      ].some((value) => value.toLowerCase().includes(term));
    });
  }, [favoritesOnly, query, templates]);

  const favoriteCount = useMemo(
    () => templates.filter((template) => template.isFavorite).length,
    [templates],
  );

  const schemaCount = useMemo(
    () => new Set(templates.map((template) => template.schemaTemplate.id)).size,
    [templates],
  );

  const latestUpdated = useMemo(() => {
    if (templates.length === 0) {
      return null;
    }

    return templates.reduce<string | null>((latest, template) => {
      if (!latest) {
        return template.updatedAt;
      }

      return new Date(template.updatedAt).getTime() > new Date(latest).getTime()
        ? template.updatedAt
        : latest;
    }, null);
  }, [templates]);

  const handleToggleFavorite = useCallback(
    async (template: MappingTemplateItem) => {
      setFavoriteLoadingId(template.id);

      try {
        const res = await fetch(`/api/mapping-templates/${template.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isFavorite: !template.isFavorite }),
        });

        await readJson(res);
        await mutate();

        toast.success(
          template.isFavorite ? "Removed from favorites" : "Marked as favorite",
          {
            description: `"${template.name}" was updated.`,
          },
        );
      } catch (err) {
        toast.error("Unable to update template", {
          description: err instanceof Error ? err.message : "Try again.",
        });
      } finally {
        setFavoriteLoadingId(null);
      }
    },
    [mutate],
  );

  const columns = useMemo<ColumnDef<MappingTemplateItem, unknown>[]>(
    () => [
      {
        id: "name",
        accessorFn: (row) => row.name,
        header: "Name",
        enableSorting: true,
        cell: ({ row }) => (
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--dashboard-panel-border)] bg-white/80 text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
              onClick={() => void handleToggleFavorite(row.original)}
              disabled={favoriteLoadingId === row.original.id}
              aria-label={row.original.isFavorite ? "Remove from favorites" : "Mark as favorite"}
              aria-pressed={row.original.isFavorite}
            >
              <Star
                className="h-3.5 w-3.5"
                fill={row.original.isFavorite ? "currentColor" : "none"}
              />
            </button>
            <span className="truncate font-medium">{row.original.name}</span>
          </div>
        ),
      },
      {
        id: "schema",
        accessorFn: (row) => row.schemaTemplate.name,
        header: "Schema",
        enableSorting: true,
        cell: ({ row }) => (
          <span>{row.original.schemaTemplate.name}</span>
        ),
      },
      {
        id: "sourceSignature",
        accessorFn: (row) => describeSourceSignature(row.sourceSignature),
        header: "Source Signature",
        enableSorting: true,
        cell: ({ row }) => (
          <span className="text-[var(--color-muted)]">
            {describeSourceSignature(row.original.sourceSignature)}
          </span>
        ),
      },
      {
        id: "mappings",
        accessorFn: (row) => countMappings(row.confirmedMapping),
        header: "Mappings",
        enableSorting: true,
        cell: ({ row }) => (
          <span className="tabular-nums">
            {countMappings(row.original.confirmedMapping)}
          </span>
        ),
      },
      {
        id: "updatedAt",
        accessorFn: (row) => row.updatedAt,
        header: "Updated",
        enableSorting: true,
        sortingFn: "datetime",
        cell: ({ row }) => (
          <span className="text-[var(--color-muted)] whitespace-nowrap">
            {formatDate(row.original.updatedAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] whitespace-nowrap ${
                row.original.isFavorite
                  ? "border-[rgba(118,96,35,0.18)] bg-[rgba(255,214,102,0.12)] text-[rgba(118,96,35,1)]"
                  : "border-[var(--dashboard-panel-border)] bg-[rgba(255,255,255,0.7)] text-[var(--color-muted)]"
              }`}
            >
              {row.original.isFavorite ? "Favorite" : "Saved"}
            </span>
            <Link
              href={`/wizard/schema?templateId=${row.original.schemaTemplate.id}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Open schema
            </Link>
          </div>
        ),
      },
    ],
    [favoriteLoadingId, handleToggleFavorite],
  );

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
          Reusable mappings
        </p>
        <h1>Mapping Templates</h1>
        <p className="dashboard-lede">
          Browse every finalized mapping result, flag the ones worth reusing, and jump back to the source schema.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        <article className="rounded-2xl border border-[var(--dashboard-panel-border)] bg-[var(--dashboard-panel-bg)] p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
            Total templates
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--color-ink)]">
            {templates.length}
          </div>
        </article>
        <article className="rounded-2xl border border-[var(--dashboard-panel-border)] bg-[var(--dashboard-panel-bg)] p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
            Favorites
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--color-ink)]">
            {favoriteCount}
          </div>
        </article>
        <article className="rounded-2xl border border-[var(--dashboard-panel-border)] bg-[var(--dashboard-panel-bg)] p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
            Schemas covered
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--color-ink)]">
            {schemaCount}
          </div>
        </article>
        <article className="rounded-2xl border border-[var(--dashboard-panel-border)] bg-[var(--dashboard-panel-bg)] p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
            Latest update
          </div>
          <div className="mt-3 text-sm font-medium text-[var(--color-ink)]">
            {latestUpdated ? formatDate(latestUpdated) : "No templates yet"}
          </div>
        </article>
      </section>

      <section className="mt-2 grid gap-4 rounded-2xl border border-[var(--dashboard-panel-border)] bg-[var(--dashboard-panel-bg)] p-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search templates, schemas, or signatures"
            className="h-10 pl-9"
          />
        </label>

        <Button
          type="button"
          variant={favoritesOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setFavoritesOnly((current) => !current)}
        >
          <Star className="h-3.5 w-3.5" />
          Favorites only
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void mutate()}
          disabled={isLoading}
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section-head">
          <div>
            <h2>All mapping templates</h2>
            <p>{filteredTemplates.length} template{filteredTemplates.length === 1 ? "" : "s"} shown.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-[var(--dashboard-panel-border)] bg-[var(--dashboard-panel-bg)] p-8">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-[rgba(180,60,48,0.18)] bg-[rgba(180,60,48,0.05)] p-5 text-sm text-[var(--color-ink)]">
            Failed to load mapping templates.
          </div>
        ) : filteredTemplates.length === 0 && templates.length > 0 ? (
          <div className="rounded-2xl border border-[var(--dashboard-panel-border)] bg-[rgba(252,251,248,0.72)] p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[var(--dashboard-panel-border)] bg-white/70 text-[var(--color-muted)]">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-[var(--font-display)] text-2xl font-semibold tracking-[-0.03em] text-[var(--color-ink)]">
              No mapping templates match
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--color-muted)]">
              Clear the filter or finish a mapping run to create the first reusable template.
            </p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="rounded-2xl border border-[var(--dashboard-panel-border)] bg-[rgba(252,251,248,0.72)] p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[var(--dashboard-panel-border)] bg-white/70 text-[var(--color-muted)]">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-[var(--font-display)] text-2xl font-semibold tracking-[-0.03em] text-[var(--color-ink)]">
              No templates yet
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--color-muted)]">
              Finish a mapping run to create your first reusable template.
            </p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredTemplates}
            globalFilter={query}
          />
        )}
      </section>
    </div>
  );
}
