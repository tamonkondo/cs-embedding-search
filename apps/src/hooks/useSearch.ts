"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { runSearch } from "../lib/search";
import type { SearchDoc, SearchMode } from "../types/search";

export function useSearch() {
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<SearchMode>("full");
  const [product, setProduct] = useState<string>("");
  const [channel, setChannel] = useState<string>("");
  const [data, setData] = useState<SearchDoc[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(
      () =>
        startTransition(async () => {
          try {
            setError(null);
            const res = await runSearch(mode, q);
            setData(res);
            setError(null);
          } catch (error) {
            console.error(error);
            setError("fetch_failed");
            setData([]);
          }
        }),
      150,
    );
    return () => clearTimeout(id);
  }, [q, mode]);

  const filtered = useMemo(
    () =>
      data.filter(
        (doc) =>
          (!product || doc.product === product) &&
          (!channel || doc.channel === channel),
      ),
    [data, product, channel],
  );

  useEffect(() => {
    setSelectedId((prev) => {
      if (filtered.length === 0) return null;
      if (prev && filtered.some((doc) => doc.id === prev)) {
        return prev;
      }
      return filtered[0]?.id ?? null;
    });
  }, [filtered]);

  const selectedDoc = useMemo(
    () => filtered.find((doc) => doc.id === selectedId) ?? null,
    [filtered, selectedId],
  );

  const select = (id: string) => {
    setSelectedId(id);
  };

  return {
    q,
    setQ,
    mode,
    setMode,
    product,
    setProduct,
    channel,
    setChannel,
    data: filtered,
    pending,
    searchNow: () =>
      startTransition(async () => {
        try {
          setError(null);
          const res = await runSearch(mode, q);
          setData(res);
          setError(null);
        } catch (error) {
          console.error(error);
          setError("fetch_failed");
          setData([]);
        }
      }),
    selectedId,
    selectedDoc,
    select,
    error,
  } as const;
}
