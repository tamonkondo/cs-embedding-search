import React from "react";
import type { SearchMode } from "@/types/search";

interface Props {
  mode: SearchMode;
}

export default function PreviewPanel({ mode }: Props) {
  return (
    <aside className="rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">プレビュー</h2>
        <span className="text-xs text-gray-500 rounded-full border px-2 py-1">
          p95: {mode === "full" ? 160 : 230}ms
        </span>
      </div>
      <div className="text-sm text-gray-600">左の結果を選ぶとここに詳細表示（UIモック）。</div>
      <ul className="mt-3 text-xs text-gray-500 list-disc pl-4">
        <li>Enter で検索、Esc で入力クリア（実装対象）</li>
        <li>ショートカット: ⌘/Ctrl + K でフォーカス（実装対象）</li>
      </ul>
    </aside>
  );
}
