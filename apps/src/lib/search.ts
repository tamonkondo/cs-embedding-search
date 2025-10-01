import { MOCK_DATA } from "./data";
import type { SearchDoc, SearchMode } from "@/types/search";

export async function mockSearch(q: string): Promise<SearchDoc[]> {
  if (!q) return [] as SearchDoc[];
  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  await new Promise((r) => setTimeout(r, 150));
  return MOCK_DATA.filter((d) => re.test(d.title) || re.test(d.body)).slice(0, 20);
}

export async function mockVectorSearch(q: string): Promise<SearchDoc[]> {
  const res = await mockSearch(q || "支払い 失敗");
  return res.sort((a, b) => (a.source_type === "ticket" ? -1 : 1));
}

export async function runSearch(mode: SearchMode, q: string) {
  return mode === "full" ? mockSearch(q) : mockVectorSearch(q);
}
