import React from "react";
import type { SearchDoc } from "@/types/search";
import ResultItem from "./ResultItem";

interface Props {
  items: SearchDoc[];
  query: string;
  pending: boolean;
}

export default function ResultsList({ items, query, pending }: Props) {
  return (
    <section aria-busy={pending} className="rounded-2xl border bg-white">
      {pending && (
        <div className="p-4 text-sm text-gray-500">検索中…（過去の結果はそのまま表示）</div>
      )}
      {items.length === 0 ? (
        <div className="p-10 text-center text-gray-500">
          一致する結果がありません。キーワードやモードを変えてみてください。
        </div>
      ) : (
        <ul className="divide-y">
          {items.map((d) => (
            <ResultItem key={d.id} doc={d} query={query} />
          ))}
        </ul>
      )}
    </section>
  );
}
