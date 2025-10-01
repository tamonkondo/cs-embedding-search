"use client"
import React from "react";
import SearchHeader from "@/components/SearchHeader";
import ResultsList from "@/components/results/ResultsList";
import PreviewPanel from "@/components/PreviewPanel";
import { useSearch } from "@/hooks/useSearch";
import { CHANNELS, PRODUCTS } from "@/types/search";


export default function Home() {
  const { q, setQ, mode, setMode, product, setProduct, channel, setChannel, data, pending, searchNow } = useSearch();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
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
      <main className="mx-auto max-w-6xl grid md:grid-cols-2 gap-4 p-4">
        <ResultsList items={data} query={q} pending={pending} />
        <PreviewPanel mode={mode} />
      </main>
      <footer className="mx-auto max-w-6xl p-4 text-xs text-gray-500">
        通常/ベクターのトグル、ハイライト、フィルタ、p95 表示までをモックで体験できます。バックエンド実装後は
        fetch を差し替えるだけで完成形になります。
      </footer>
    </div>
  );
}
