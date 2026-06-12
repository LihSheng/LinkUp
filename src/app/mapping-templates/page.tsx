"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { LayoutGrid, RefreshCcw, Search, Star } from "lucide-react";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
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
    // fall back to generic copy below
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

  return (
    <DashboardShell>
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
            <div className="grid gap-4 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-[var(--dashboard-panel-border)] bg-[var(--dashboard-panel-bg)] p-5"
                >
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="mt-4 h-4 w-full" />
                  <Skeleton className="mt-2 h-4 w-4/5" />
                  <Skeleton className="mt-6 h-24 w-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-[rgba(180,60,48,0.18)] bg-[rgba(180,60,48,0.05)] p-5 text-sm text-[var(--color-ink)]">
              Failed to load mapping templates.
            </div>
          ) : filteredTemplates.length === 0 ? (
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
          ) : (
            <div className="grid gap-4 xl:grid-cols-3">
              {filteredTemplates.map((template) => {
                const mappingCount = countMappings(template.confirmedMapping);
                const sourceSignatureSummary = describeSourceSignature(template.sourceSignature);

                return (
                  <article
                    key={template.id}
                    className="group rounded-2xl border border-[var(--dashboard-panel-border)] bg-[var(--dashboard-panel-bg)] p-5 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset] transition-transform duration-200 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--dashboard-panel-border)_75%,var(--color-ink)_25%)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                          {template.schemaTemplate.name}
                        </p>
                        <h3 className="mt-2 truncate font-[var(--font-display)] text-[1.55rem] leading-tight tracking-[-0.03em] text-[var(--color-ink)]">
                          {template.name}
                        </h3>
                      </div>

                      <button
                        type="button"
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--dashboard-panel-border)] bg-white/80 text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
                        onClick={() => void handleToggleFavorite(template)}
                        disabled={favoriteLoadingId === template.id}
                        aria-label={template.isFavorite ? "Remove from favorites" : "Mark as favorite"}
                        aria-pressed={template.isFavorite}
                      >
                        <Star
                          className="h-4 w-4"
                          fill={template.isFavorite ? "currentColor" : "none"}
                        />
                      </button>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-[var(--color-muted)]">
                      <div className="rounded-xl border border-[var(--dashboard-panel-border)] bg-[rgba(252,251,248,0.7)] p-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                          Source signature
                        </div>
                        <div className="mt-2 text-[0.92rem] leading-6 text-[var(--color-ink)]">
                          {sourceSignatureSummary}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-[var(--dashboard-panel-border)] bg-[rgba(252,251,248,0.7)] p-3">
                          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                            Rules
                          </div>
                          <div className="mt-2 text-[0.92rem] text-[var(--color-ink)]">
                            {mappingCount} mapping{mappingCount === 1 ? "" : "s"}
                          </div>
                        </div>
                        <div className="rounded-xl border border-[var(--dashboard-panel-border)] bg-[rgba(252,251,248,0.7)] p-3">
                          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                            Updated
                          </div>
                          <div className="mt-2 text-[0.92rem] text-[var(--color-ink)]">
                            {formatDate(template.updatedAt)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
                          template.isFavorite
                            ? "border-[rgba(118,96,35,0.18)] bg-[rgba(255,214,102,0.12)] text-[rgba(118,96,35,1)]"
                            : "border-[var(--dashboard-panel-border)] bg-[rgba(255,255,255,0.7)] text-[var(--color-muted)]"
                        }`}
                      >
                        {template.isFavorite ? "Favorite" : "Saved"}
                      </span>

                      <Link
                        href={`/wizard/schema?templateId=${template.schemaTemplate.id}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Open schema
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
