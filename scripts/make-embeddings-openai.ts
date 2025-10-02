import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";
import OpenAI from "openai";

const MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
const OUTPUT_PATH = path.resolve("services/faiss/embeddings.jsonl");
const BATCH_SIZE = Number(process.env.EMBED_BATCH_SIZE ?? 100);
const MAX_BODY_LENGTH = 6000;

async function fetchDocuments(client: Client) {
  const res = await client.query<{ id: string; body: string }>(
    "SELECT id, body FROM knowledge_units ORDER BY updated_at DESC",
  );
  if (!res.rowCount) {
    throw new Error("knowledge_units is empty. Run seed script first.");
  }
  return res.rows;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required");
  }

  const client = new Client({ connectionString });
  await client.connect();
  console.log("✅ connected to database");

  const documents = await fetchDocuments(client);
  await client.end();

  const openai = new OpenAI({ apiKey });
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  const stream = fs.createWriteStream(OUTPUT_PATH, { flags: "w" });

  try {
    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
      const chunk = documents.slice(i, i + BATCH_SIZE);
      const inputs = chunk.map((row) => row.body.slice(0, MAX_BODY_LENGTH));

      const response = await openai.embeddings.create({ model: MODEL, input: inputs });

      response.data.forEach((item, idx) => {
        const payload = {
          id: chunk[idx].id,
          vector: item.embedding,
        } satisfies { id: string; vector: number[] };
        stream.write(`${JSON.stringify(payload)}\n`);
      });

      console.log(`📦 embedded ${Math.min(i + BATCH_SIZE, documents.length)}/${documents.length}`);
      // Basic pacing to avoid burst rate limits
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  } finally {
    stream.end();
  }

  console.log(`🎯 embeddings written to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
