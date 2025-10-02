"use client";
import { useTranslations } from "next-intl";
import type { SearchDoc } from "../../types/search";
import ResultItem from "./ResultItem";

interface Props {
  items: SearchDoc[];
  query: string;
  pending: boolean;
  error: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function ResultsList({
  items,
  query,
  pending,
  error,
  selectedId,
  onSelect,
}: Props) {
  const t = useTranslations("results");
  return (
    <section
      aria-busy={pending}
      aria-live="polite"
      className="rounded-2xl border bg-card shadow-sm"
      aria-label={t("listLabel")}
    >
      {pending && <p className="p-3 text-sm text-accent">{t("loading")}</p>}
      {error && (
        <div className="p-3 text-sm text-destructive" role="alert">
          {t("error")}
        </div>
      )}
      {items.length === 0 && !pending && !error ? (
        <div className="p-10 text-center text-muted-foreground">
          {t("empty")}
        </div>
      ) : null}
      {items.length > 0 && (
        <ul className="divide-y">
          {items.map((doc, index) => (
            <ResultItem
              key={doc.id}
              doc={doc}
              query={query}
              index={index}
              isSelected={doc.id === selectedId}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
