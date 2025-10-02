"use client";
import { useTranslations } from "next-intl";
import PreviewPanel from "../../components/PreviewPanel";
import ResultsList from "../../components/results/ResultsList";
import SearchHeader from "../../components/SearchHeader";
import { useSearch } from "../../hooks/useSearch";
import { CHANNELS, PRODUCTS } from "../../types/search";

export default function HomePage() {
  const {
    q,
    setQ,
    mode,
    setMode,
    product,
    setProduct,
    channel,
    setChannel,
    data,
    pending,
    error,
    searchNow,
    selectedId,
    selectedDoc,
    select,
  } = useSearch();
  const t = useTranslations("footer");

  return (
    <div className="min-h-screen" data-testid="app-shell">
      <a href="#results" className="skip-link">
        {t("skipToResults")}
      </a>
      <SearchHeader
        q={q}
        onChangeQ={setQ}
        mode={mode}
        onToggleMode={() => setMode(mode === "full" ? "vec" : "full")}
        product={product}
        onChangeProduct={setProduct}
        channel={channel}
        onChangeChannel={setChannel}
        products={PRODUCTS}
        channels={CHANNELS}
        onSearchNow={searchNow}
      />
      <main
        id="results"
        className="mx-auto max-w-6xl grid md:grid-cols-2 gap-4 p-4"
        aria-live="polite"
      >
        <ResultsList
          items={data}
          query={q}
          pending={pending}
          error={error}
          selectedId={selectedId}
          onSelect={select}
        />
        <PreviewPanel
          mode={mode}
          selected={selectedDoc}
          query={q}
          pending={pending}
        />
      </main>
      <footer className="mx-auto max-w-6xl p-4 text-xs text-muted-foreground">
        {t("description")}
      </footer>
    </div>
  );
}
