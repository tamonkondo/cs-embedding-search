import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "../../../db/client";
import type { SearchDoc } from "../../../types/search";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) {
    return NextResponse.json([]);
  }

  const pattern = `%${q.trim()}%`;
  const rows = await db.execute<SearchDoc>(
    `SELECT id, title, body, source_type, product, channel, updated_at
     FROM knowledge_units
     WHERE title ILIKE $1 OR body ILIKE $1
     ORDER BY updated_at DESC
     LIMIT 20`,
    [pattern],
  );

  return NextResponse.json(rows);
}
