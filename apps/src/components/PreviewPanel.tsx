"use client";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { highlightParts } from "../lib/highlight";
import type { SearchDoc, SearchMode } from "../types/search";

interface Metrics {
  full: number | null;
  vector: number | null;
}

const DEFAULT_METRICS: Metrics = { full: null, vector: null };

async function loadMetrics(): Promise<Metrics> {
  try {
    const res = await fetch("/metrics.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`metrics fetch failed (${res.status})`);
    const data = (await res.json()) as {
      p95?: { full?: number; vector?: number };
    };
    return {
      full: data.p95?.full ?? null,
      vector: data.p95?.vector ?? null,
    };
  } catch (error) {
    console.error(error);
    return DEFAULT_METRICS;
  }
}

interface Props {
  mode: SearchMode;
  selected: SearchDoc | null;
  query: string;
  pending: boolean;
}

export default function PreviewPanel({
  mode,
  selected,
  query,
  pending,
}: Props) {
  const [metrics, setMetrics] = useState<Metrics>(DEFAULT_METRICS);
  const t = useTranslations("preview");
  const locale = useLocale();

  useEffect(() => {
    loadMetrics().then(setMetrics);
  }, []);

  const fullLabel = metrics.full != null ? `${metrics.full}ms` : "--";
  const vectorLabel = metrics.vector != null ? `${metrics.vector}ms` : "--";
  const metricsLabel = t("metricsLabel", {
    full: fullLabel,
    vector: vectorLabel,
  });

  const formattedDate = useMemo(() => {
    if (!selected) return "";
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(selected.updated_at));
  }, [locale, selected]);

  const paragraphs = useMemo(() => {
    if (!selected) return [] as { text: string; key: string }[];
    const raw = selected.body ?? "";
    const blocks: { text: string; key: string }[] = [];
    const separator = /\n{2,}/g;
    let lastIndex = 0;
    let segmentMatch = separator.exec(raw);

    while (segmentMatch !== null) {
      const end = segmentMatch.index;
      const segment = raw.slice(lastIndex, end).trim();
      if (segment) {
        blocks.push({ text: segment, key: `${lastIndex}-${end}` });
      }
      lastIndex = separator.lastIndex;
      segmentMatch = separator.exec(raw);
    }

    if (lastIndex < raw.length) {
      const tail = raw.slice(lastIndex).trim();
      if (tail) {
        blocks.push({ text: tail, key: `${lastIndex}-${raw.length}` });
      }
    }

    if (blocks.length === 0 && raw.trim().length > 0) {
      return [{ text: raw.trim(), key: "0" }];
    }

    return blocks;
  }, [selected]);

  return (
    <aside
      className="rounded-2xl border bg-card p-4 outline-none shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      tabIndex={-1}
      data-preview-panel
      aria-live="polite"
      aria-label={metricsLabel}
      data-mode={mode}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{t("title")}</h2>
        <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
          {metricsLabel}
        </span>
      </div>
      {pending ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : selected ? (
        <article className="space-y-3" aria-live="polite">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {selected.title}
            </h3>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                {t("metaSource", { source: selected.source_type })}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                {t("metaProduct", { product: selected.product })}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                {t("metaChannel", { channel: selected.channel })}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                {t("metaUpdated", { date: formattedDate })}
              </span>
            </div>
          </div>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            {paragraphs.map((paragraph) => {
              const parts = highlightParts(paragraph.text, query);
              return (
                <p key={paragraph.key}>
                  {parts.map((part) =>
                    part.match ? (
                      <mark
                        key={part.key}
                        className="rounded bg-accent/20 px-1 py-0.5 text-foreground"
                      >
                        {part.text}
                      </mark>
                    ) : (
                      <span key={part.key}>{part.text}</span>
                    ),
                  )}
                </p>
              );
            })}
          </div>
        </article>
      ) : (
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>{t("noSelection")}</p>
          <ul className="list-disc pl-4 text-xs text-muted-foreground">
            <li>{t("tipSearch")}</li>
            <li>{t("tipShortcut")}</li>
          </ul>
        </div>
      )}
    </aside>
  );
}
