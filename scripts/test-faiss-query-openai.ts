import { Client } from "pg";
import OpenAI from "openai";

const MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
const FAISS_URL = process.env.FAISS_URL || "http://127.0.0.1:8000";

async function fetchEmbedding(openai: OpenAI, text: string) {
  const { data } = await openai.embeddings.create({ model: MODEL, input: text });
  return data[0]?.embedding ?? [];
}

async function callFaiss(embedding: number[], k: number) {
  const res = await fetch(`${FAISS_URL}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embedding, k }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FAISS search failed (${res.status}): ${text}`);
  }
  return (await res.json()) as { row_indexes: number[]; scores: number[] };
}

async function fetchIds() {
  const res = await fetch(`${FAISS_URL}/ids`);
  if (!res.ok) {
    throw new Error(`Failed to fetch ids (${res.status})`);
  }
  return (await res.json()) as string[];
}

async function main() {
  const query = process.argv.slice(2).join(" ") || "支払い 失敗";
  const apiKey = process.env.OPENAI_API_KEY;
  const connectionString = process.env.DATABASE_URL;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required");
  }
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const openai = new OpenAI({ apiKey });
  const embedding = await fetchEmbedding(openai, query);
  console.log(`🔍 query: "${query}"`);

  const { row_indexes } = await callFaiss(embedding, 5);
  if (!row_indexes.length) {
    console.log("⚠️  no matches returned from FAISS");
    return;
  }

  const ids = await fetchIds();
  const knowledgeUnitIds = row_indexes
    .map((idx) => ids[idx])
    .filter((value): value is string => Boolean(value));

  if (!knowledgeUnitIds.length) {
    console.log("⚠️  no valid ids found for returned indexes");
    return;
  }

  const db = new Client({ connectionString });
  await db.connect();
  const { rows } = await db.query(
    "SELECT id, title, LEFT(body, 140) AS snippet FROM knowledge_units WHERE id = ANY($1)",
    [knowledgeUnitIds],
  );
  await db.end();

  const rowsById = new Map(rows.map((row) => [row.id, row] as const));
  knowledgeUnitIds.forEach((id, index) => {
    const row = rowsById.get(id);
    if (row) {
      console.log(
        `${index + 1}. ${row.title}\n   ${row.snippet?.replace(/\s+/g, " ") ?? "(no snippet)"}\n`,
      );
    }
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
