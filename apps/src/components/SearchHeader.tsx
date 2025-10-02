"use client";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import type { SearchMode } from "../types/search";
import ThemeToggle from "./ThemeToggle";

interface Props {
  q: string;
  onChangeQ: (v: string) => void;
  mode: SearchMode;
  onToggleMode: () => void;
  product: string;
  onChangeProduct: (v: string) => void;
  channel: string;
  onChangeChannel: (v: string) => void;
  products: readonly string[];
  channels: readonly string[];
  onSearchNow?: () => void;
}

export default function SearchHeader({
  q,
  onChangeQ,
  mode,
  onToggleMode,
  product,
  onChangeProduct,
  channel,
  onChangeChannel,
  products,
  channels,
  onSearchNow,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations("search");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto grid max-w-6xl items-center gap-2 px-4 py-3 md:grid-cols-[1fr_auto_auto_auto_auto]">
        <div className="flex items-center gap-2">
          <input
            aria-label={t("placeholder")}
            placeholder={t("placeholder")}
            value={q}
            onChange={(e) => onChangeQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSearchNow?.();
              if (e.key === "Escape") onChangeQ("");
            }}
            ref={inputRef}
            className="w-full rounded-2xl border border-border bg-card px-4 py-2 text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-describedby="search-field-hint"
          />
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={mode === "vec"}
          onClick={onToggleMode}
          aria-label={t("toggleAria")}
          className="justify-self-end rounded-2xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title={t("toggleAria")}
        >
          {mode === "full" ? t("toggleFull") : t("toggleVector")}
        </button>
        <select
          value={product}
          onChange={(e) => onChangeProduct(e.target.value)}
          className="rounded-2xl border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t("productLabel")}
        >
          <option value="">{t("productAll")}</option>
          {products.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={channel}
          onChange={(e) => onChangeChannel(e.target.value)}
          className="rounded-2xl border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t("channelLabel")}
        >
          <option value="">{t("channelAll")}</option>
          {channels.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="justify-self-end">
          <ThemeToggle />
        </div>
      </div>
      <p id="search-field-hint" className="sr-only">
        {t("manualTrigger")} / {t("clearInput")}
      </p>
    </header>
  );
}
