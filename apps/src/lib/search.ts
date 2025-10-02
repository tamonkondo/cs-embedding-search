import type { SearchDoc, SearchMode } from "../types/search";

async function fetchJSON<T>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const message = await res.text();
    throw new Error(`Request failed (${res.status}): ${message}`);
  }
  return (await res.json()) as T;
}

export async function search(q: string): Promise<SearchDoc[]> {
  if (!q.trim()) return [];
  const params = new URLSearchParams({ q });
  return fetchJSON<SearchDoc[]>(`/api/search?${params.toString()}`, {
    cache: "no-store",
  });
}

export async function vectorSearch(q: string, k = 20): Promise<SearchDoc[]> {
  if (!q.trim()) return [];
  return fetchJSON<SearchDoc[]>("/api/vector-search", {
    method: "POST",
    body: JSON.stringify({ query: q, k }),
    cache: "no-store",
  });
}

export async function runSearch(mode: SearchMode, q: string) {
  return mode === "full" ? search(q) : vectorSearch(q);
}
