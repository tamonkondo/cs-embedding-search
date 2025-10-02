import type { SearchDoc } from "../types/search";

export const MOCK_DATA: SearchDoc[] = Array.from({ length: 40 }).map(
  (_, i) => ({
    id: `ku_${i}`,
    title: `支払いが失敗する時の対処 ${i}`,
    body: "カードの本人認証(3Dセキュア)が失敗した場合は再試行し、別ブラウザでの決済を案内してください。",
    source_type: (i % 3 === 0
      ? "ticket"
      : i % 3 === 1
        ? "help"
        : "manual") as SearchDoc["source_type"],
    product: ["Starter", "Pro", "Enterprise"][i % 3] as SearchDoc["product"],
    channel: ["email", "chat", "phone"][i % 3] as SearchDoc["channel"],
    updated_at: new Date(Date.now() - i * 36e5).toISOString(),
  }),
);
