import OpenAI from "openai";

const MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY env var is required");
  }
  return new OpenAI({ apiKey });
}

const client = getClient();

export async function embed(text: string) {
  const trimmed = text.slice(0, 6000);
  const { data } = await client.embeddings.create({
    model: MODEL,
    input: trimmed,
  });
  const vector = data[0]?.embedding;
  if (!vector) {
    throw new Error("Failed to generate embedding");
  }
  return vector as number[];
}
