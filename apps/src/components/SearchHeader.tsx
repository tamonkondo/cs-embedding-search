"use client";
import React, { useEffect, useRef } from "react";
import type { SearchMode } from "@/types/search";

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
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
      <div className="mx-auto max-w-6xl px-4 py-3 grid gap-2 md:grid-cols-[1fr_auto_auto_auto] items-center">
        <div className="flex items-center gap-2">
          <input
            aria-label="検索"
            placeholder="例: カード 使えない / 支払い 失敗"
            value={q}
            onChange={(e) => onChangeQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSearchNow?.();
              if (e.key === "Escape") onChangeQ("");
            }}
            ref={inputRef}
            className="w-full rounded-2xl border px-4 py-2 focus:outline-none focus:ring"
          />
        </div>
        <button
          role="switch"
          aria-checked={mode === "vec"}
          onClick={onToggleMode}
          className="justify-self-end rounded-2xl border px-4 py-2 hover:bg-gray-50"
          title="通常/ベクター切替"
        >
          {mode === "full" ? "通常検索" : "ベクター検索"}
        </button>
        <select value={product} onChange={(e) => onChangeProduct(e.target.value)} className="rounded-2xl border px-3 py-2">
          <option value="">製品: すべて</option>
          {products.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select value={channel} onChange={(e) => onChangeChannel(e.target.value)} className="rounded-2xl border px-3 py-2">
          <option value="">チャネル: すべて</option>
          {channels.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}
