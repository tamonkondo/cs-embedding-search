import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "../../../db/client";
import { embed } from "../../../lib/embed";
import type { SearchDoc } from "../../../types/search";

export const runtime = "nodejs";

const FAISS_URL = process.env.FAISS_URL || "http://127.0.0.1:8000";

type VectorSearchPayload = {
  query?: string | null;
  k?: number | null;
};

async function parseBody(req: NextRequest): Promise<VectorSearchPayload> {
  const contentType =
    req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";

  if (contentType === "application/json") {
    try {
      return (await req.json()) as VectorSearchPayload;
    } catch (_error) {
      throw new Error("invalid_json");
    }
  }

  if (contentType === "application/x-www-form-urlencoded") {
    const raw = await req.text();
    const params = new URLSearchParams(raw);
    const query = params.get("query");
    const kValue = params.get("k");
    return {
      query,
      k: kValue ? Number(kValue) : undefined,
    };
  }

  if (contentType === "text/plain") {
    const text = (await req.text()).trim();
    return { query: text.length > 0 ? text : undefined };
  }

  const fallback = (await req.text()).trim();
  if (!fallback) return {};

  try {
    return JSON.parse(fallback) as VectorSearchPayload;
  } catch (_error) {
    return { query: fallback };
  }
}

export async function POST(req: NextRequest) {
  try {
    let body: VectorSearchPayload;
    try {
      body = await parseBody(req);
    } catch (_error) {
      return NextResponse.json(
        { error: "invalid request body" },
        { status: 400 },
      );
    }

    const query = typeof body.query === "string" ? body.query.trim() : "";
    const kRaw = body.k ?? undefined;

    if (!query) {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }

    const k = Number.isFinite(kRaw) && Number(kRaw) > 0 ? Number(kRaw) : 20;

    console.log("[vector-search] query:", query, "k:", k);
    const vector = await embed(query);
    console.log("[vector-search] embedding length:", vector.length);
    
    const searchRes = await fetch(`${FAISS_URL}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embedding: vector, k }),
    });
    
    if (!searchRes.ok) {
      const text = await searchRes.text();
      console.error("[vector-search] faiss error:", text);
      return NextResponse.json(
        { error: `faiss error: ${text}` },
        { status: 502 },
      );
    }
    
    const { row_indexes } = (await searchRes.json()) as { row_indexes: number[] };
    console.log("[vector-search] row_indexes:", row_indexes);
    if (!row_indexes?.length) {
      return NextResponse.json([]);
    }
    
    const idsRes = await fetch(`${FAISS_URL}/ids`);
    if (!idsRes.ok) {
      console.error("[vector-search] failed to fetch ids");
      return NextResponse.json({ error: "failed to fetch ids" }, { status: 502 });
    }
    
    const ids = (await idsRes.json()) as string[];
    console.log("[vector-search] ids length:", ids.length);
    
    const knowledgeUnitIds = row_indexes
      .map((idx) => ids[idx])
      .filter((value): value is string => Boolean(value));
    console.log("[vector-search] mapped knowledgeUnitIds:", knowledgeUnitIds);
    
    if (!knowledgeUnitIds.length) {
      return NextResponse.json([]);
    }
    
    const rows = await db.execute<SearchDoc>(
      `SELECT id, title, body, source_type, product, channel, updated_at
       FROM knowledge_units WHERE id = ANY($1::text[])`,
      [knowledgeUnitIds],
    );
    console.log("[vector-search] db rows length:", rows.length);
    
    const lookup = new Map(rows.map((row) => [row.id, row] as const));
    const ordered = knowledgeUnitIds
      .map((id) => lookup.get(id))
      .filter((row): row is SearchDoc => Boolean(row));
    
    console.log("[vector-search] ordered length:", ordered.length);
    return NextResponse.json(ordered);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
