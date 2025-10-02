import { randomUUID } from "crypto";
import { Client } from "pg";

const SOURCE_TYPES = ["ticket", "help", "manual"] as const;
const PRODUCTS = ["Starter", "Pro", "Enterprise"] as const;
const CHANNELS = ["email", "chat", "phone"] as const;
const ISSUE_TYPES = [
  "ログイン",
  "請求",
  "通知",
  "インボイス",
  "セキュリティ",
  "権限",
  "エクスポート",
  "API",
  "自動化",
  "請求書",
  "チャット連携",
  "決済",
  "キャンセル",
  "アップグレード",
  "ダウングレード",
];
const ACTION_VERBS = [
  "できない",
  "失敗する",
  "反映されない",
  "遅延する",
  "タイムアウトする",
  "不明瞭",
  "リトライになる",
  "無限ループする",
  "解除できない",
  "設定が崩れる",
];

const BODY_SNIPPETS = [
  "影響範囲を明記し、お客様の業務にどのような支障が出ているかを整理します。",
  "期待していた挙動と実際の挙動を箇条書きにして比較します。",
  "最新のリリースノートとログを確認し、再現手順をドキュメント化します。",
  "サポートでは暫定回避策としてブラウザキャッシュのクリアと再ログインを推奨しています。",
  "エンジニアリングチームにエスカレーションする際は計測データとスクリーンショットを添付します。",
  "類似ケースをナレッジベースから検索し、ユーザーへの説明文テンプレートを更新します。",
];

const TARGET_COUNT = Number(process.env.SEED_COUNT ?? 1200);

function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function buildParagraph(): string {
  const selected = Array.from({ length: 4 }, (_, idx) =>
    BODY_SNIPPETS[(idx + Math.floor(Math.random() * BODY_SNIPPETS.length)) % BODY_SNIPPETS.length],
  );
  return selected.join("\n\n");
}

function buildTitle(): string {
  const issue = randomItem(ISSUE_TYPES);
  const verb = randomItem(ACTION_VERBS);
  return `${issue}が${verb}`;
}

function randomDateWithin(days: number): Date {
  const now = Date.now();
  const offset = Math.floor(Math.random() * days * 24 * 60 * 60 * 1000);
  return new Date(now - offset);
}

async function ensureSchema(client: Client) {
  await client.query("CREATE EXTENSION IF NOT EXISTS pg_trgm");
  await client.query(`
    CREATE TABLE IF NOT EXISTS knowledge_units (
      id UUID PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      source_type TEXT NOT NULL,
      product TEXT NOT NULL,
      channel TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  await client.query(
    "CREATE INDEX IF NOT EXISTS knowledge_units_updated_at_idx ON knowledge_units(updated_at DESC)",
  );
  await client.query(
    "CREATE INDEX IF NOT EXISTS knowledge_units_body_trgm_idx ON knowledge_units USING GIN (body gin_trgm_ops)",
  );
  await client.query(
    "CREATE INDEX IF NOT EXISTS knowledge_units_title_trgm_idx ON knowledge_units USING GIN (title gin_trgm_ops)",
  );
}

async function seedKnowledgeUnits(client: Client, deficit: number) {
  const batchSize = 200;
  let inserted = 0;

  while (inserted < deficit) {
    const size = Math.min(batchSize, deficit - inserted);
    const values: unknown[] = [];
    const placeholders: string[] = [];

    for (let i = 0; i < size; i += 1) {
      const id = randomUUID();
      const title = buildTitle();
      const sourceType = randomItem(SOURCE_TYPES);
      const product = randomItem(PRODUCTS);
      const channel = randomItem(CHANNELS);
      const updatedAt = randomDateWithin(120);
      const body = [
        `${title}に関するお問い合わせへの対応ガイドです。`,
        buildParagraph(),
        `このケースでは ${product} プランの ${channel} 窓口から報告されています。`,
        `ソースタイプは ${sourceType} で、関係部署との連携フローを明確に記述してください。`,
      ].join("\n\n");

      const baseIndex = i * 7;
      placeholders.push(
        `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7})`,
      );
      values.push(id, title, body, sourceType, product, channel, updatedAt.toISOString());
    }

    await client.query(
      `INSERT INTO knowledge_units (id, title, body, source_type, product, channel, updated_at)
       VALUES ${placeholders.join(",")}`,
      values,
    );
    inserted += size;
    console.log(`📥 inserted ${inserted}/${deficit} new knowledge units`);
  }
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const client = new Client({ connectionString });
  await client.connect();
  console.log("✅ connected to database");

  try {
    await ensureSchema(client);
    const { rows } = await client.query<{ count: string }>("SELECT COUNT(*) as count FROM knowledge_units");
    const currentCount = Number(rows[0]?.count ?? 0);
    console.log(`ℹ️  current knowledge_units count: ${currentCount}`);

    if (currentCount >= TARGET_COUNT) {
      console.log(`✅ target met (>= ${TARGET_COUNT}). Nothing to insert.`);
      return;
    }

    const deficit = TARGET_COUNT - currentCount;
    console.log(`🚀 inserting ${deficit} additional records`);
    await seedKnowledgeUnits(client, deficit);

    const { rows: finalRows } = await client.query<{ count: string }>(
      "SELECT COUNT(*) as count FROM knowledge_units",
    );
    console.log(`🎉 done. total records: ${finalRows[0]?.count ?? "0"}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
