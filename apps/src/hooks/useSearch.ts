"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { SearchMode } from "@/types/search";
import { runSearch } from "@/lib/search";

export function useSearch() {
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<SearchMode>("full");
  const [product, setProduct] = useState<string>("");
  const [channel, setChannel] = useState<string>("");
  const [data, setData] = useState([] as Awaited<ReturnType<typeof runSearch>>);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const id = setTimeout(
      () =>
        startTransition(async () => {
          const res = await runSearch(mode, q);
          setData(res);
        }),
      150,
    );
    return () => clearTimeout(id);
  }, [q, mode]);

  const filtered = useMemo(
    () => data.filter((d) => (!product || d.product === product) && (!channel || d.channel === channel)),
    [data, product, channel],
  );

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
        const res = await runSearch(mode, q);
        setData(res);
      }),
  } as const;
}
