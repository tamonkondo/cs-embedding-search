"use client";
import { useTranslations } from "next-intl";
import { Fragment } from "react";
import { highlightParts } from "../../lib/highlight";
import type { SearchDoc } from "../../types/search";

interface Props {
  doc: SearchDoc;
  query: string;
  index: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export default function ResultItem({
  doc,
  query,
  index,
  isSelected,
  onSelect,
}: Props) {
  const t = useTranslations("results");
  const metaDescription = t("itemDescription", {
    product: doc.product,
    channel: doc.channel,
    date: new Date(doc.updated_at).toLocaleString("ja-JP"),
  });
  const titleParts = highlightParts(doc.title, query);
  const bodyParts = highlightParts(doc.body, query);

  return (
    <li
      className={`group rounded-2xl border-l-4 p-4 transition-colors ${
        isSelected
          ? "border-accent bg-accent/15 text-foreground"
          : "border-transparent hover:bg-muted"
      }`}
      data-result-index={index}
      data-selected={isSelected ? "true" : "false"}
    >
      <button
        type="button"
        className="w-full rounded-lg bg-transparent text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={metaDescription}
        onClick={() => {
          onSelect(doc.id);
          requestAnimationFrame(() => {
            const preview = document.querySelector<HTMLElement>(
              "[data-preview-panel]",
            );
            preview?.focus({ preventScroll: false });
          });
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.click();
          }
        }}
        aria-pressed={isSelected}
      >
        <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
            {doc.source_type}
          </span>
          <span>{doc.product}</span>
          <span>•</span>
          <span>{new Date(doc.updated_at).toLocaleString("ja-JP")}</span>
        </div>
        <h3 className="font-medium leading-tight">
          {titleParts.map((part) => (
            <Fragment key={`title-${index}-${part.key}`}>
              {part.match ? (
                <mark className="rounded bg-accent/30 px-1 py-0.5 text-foreground">
                  {part.text}
                </mark>
              ) : (
                part.text
              )}
            </Fragment>
          ))}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {bodyParts.map((part) => (
            <Fragment key={`body-${index}-${part.key}`}>
              {part.match ? (
                <mark className="rounded bg-accent/20 px-1 py-0.5 text-foreground">
                  {part.text}
                </mark>
              ) : (
                part.text
              )}
            </Fragment>
          ))}
        </p>
      </button>
    </li>
  );
}
