# AGENTS_OpenAI.md — カスタマーサポート検索（通常＋ベクター）OpenAI埋め込み版

> 目的：OpenAI Embeddings API を使って **最短で安定**する実装に切替。Codex/Agent がそのまま実行できるよう、工程を **分割カード**化。

---

## 0. 全体像（差分）

* **埋め込み**：`OpenAI Embeddings API`（推奨 `text-embedding-3-small` / 1536 次元）
* **ベクター検索**：FAISS（Python, FastAPI）
* **通常検索**：Postgres + `pg_trgm`
* **実行**：Docker（Postgres・FAISS）／Next.js はホスト
* **互換**：ローカル変換（Transformers.js）は **Fallback** として残す

**DIM を 1536 に統一**（FAISS / スクリプト / サーバ）。

---

## 1. 事前準備（共通）

* ルート `.env.local`

```env
DATABASE_URL=postgres://app:app@localhost:5432/app
FAISS_URL=http://127.0.0.1:8000
OPENAI_API_KEY=YOUR_KEY
EMBEDDING_MODEL=text-embedding-3-small
```

* 依存:

```bash
pnpm add openai pg
pnpm add -D tsx
```

* Docker 起動（DB/FAISS）

```bash
docker compose up -d --build
```

---

## 2. ディレクトリ（再掲）

```
apps/web/                        # Next.js
services/faiss/                  # Python FAISS
scripts/                         # 一回もの
  ├─ seed.ts                    
  ├─ make-embeddings-openai.ts   # New
  └─ test-faiss-query-openai.ts  # New
```

---

# 分割手順カード（Codex向け）

> 各カードを **単体で実行**できるようにしてあります。成功判定とログを必ず出す。

---

## C1. Seed — ダミーデータ投入

**Goal**: `knowledge_units` に 1000+ 件を投入。
**Touch**: `scripts/seed.ts`（既存）
**Run**:

```bash
pnpm tsx scripts/seed.ts
```

**Check**:

```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM knowledge_units;"
```

**Done if**: 件数 ≥ 1000。

---

## C2. Embeddings — OpenAI で embeddings.jsonl 作成

**Goal**: DB の本文→埋め込み→`services/faiss/embeddings.jsonl` を出力。
**Touch**: `scripts/make-embeddings-openai.ts`

```ts
// scripts/make-embeddings-openai.ts
import fs from "node:fs";
import { Client } from "pg";
import OpenAI from "openai";

const MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small"; // 1536

async function main(){
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const { rows } = await db.query("SELECT id, body FROM knowledge_units ORDER BY updated_at DESC");

  const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  fs.mkdirSync("services/faiss", { recursive: true });
  const ws = fs.createWriteStream("services/faiss/embeddings.jsonl", { flags: "w" });

  const BATCH = 100;
  for (let i=0;i<rows.length;i+=BATCH){
    const chunk = rows.slice(i, i+BATCH);
    const inputs = chunk.map(r => String(r.body).slice(0, 6000));
    const res = await ai.embeddings.create({ model: MODEL, input: inputs });
    res.data.forEach((d, idx) => {
      ws.write(JSON.stringify({ id: chunk[idx].id, vector: d.embedding })+"\n");
    });
    console.log(`[emb] ${Math.min(i+BATCH, rows.length)}/${rows.length}`);
  }
  ws.end(); await db.end();
  console.log("✅ embeddings.jsonl ready -> services/faiss/embeddings.jsonl");
}
main().catch(e=>{ console.error(e); process.exit(1); });
```

**Run**:

```bash
pnpm tsx scripts/make-embeddings-openai.ts
```

**Check**:

```bash
head -n 2 services/faiss/embeddings.jsonl
# => {"id":"...","vector":[...]} が出力されている
```

**Done if**: ファイルサイズ > 0、行数 ≒ レコード数。

---

## C3. BuildIndex — FAISS インデックス生成

**Goal**: `support.idx` と `.ids` を作成。
**Touch**: `services/faiss/build_index.py`（DIM=**1536**）

```python
# services/faiss/build_index.py
import faiss, json, numpy as np, os
DIM = 1536
EMB_PATH = os.environ.get("EMB_PATH", "/app/embeddings.jsonl")
INDEX_PATH = os.environ.get("INDEX_PATH", "/app/index/support.idx")

ids, vecs = [], []
with open(EMB_PATH, "r", encoding="utf-8") as f:
    for line in f:
        o = json.loads(line)
        ids.append(o["id"]) ; vecs.append(o["vector"])
xb = np.array(vecs, dtype="float32")
faiss.normalize_L2(xb)
index = faiss.IndexFlatIP(DIM)
index.add(xb)
os.makedirs(os.path.dirname(INDEX_PATH), exist_ok=True)
faiss.write_index(index, INDEX_PATH)
with open(INDEX_PATH + ".ids", "w", encoding="utf-8") as f:
    json.dump(ids, f)
print("✅ index built:", INDEX_PATH, "items:", len(ids))
```

**Run**:

```bash
docker compose exec faiss python build_index.py
```

**Check**:

```bash
docker compose exec faiss ls -lah /app/index
```

**Done if**: `support.idx` と `support.idx.ids` がある。

---

## C4. FaissAPI — サーバ起動（DIM=1536）

**Goal**: `/search` と `/ids` が応答。
**Touch**: `services/faiss/server.py`（DIM=**1536**）

```python
# services/faiss/server.py
from fastapi import FastAPI
from pydantic import BaseModel
import faiss, numpy as np, json, os
DIM = 1536
INDEX_PATH = os.environ.get("INDEX_PATH", "/app/index/support.idx")
IDS_PATH = INDEX_PATH + ".ids"
app = FastAPI()
index = faiss.read_index(INDEX_PATH)
ids = json.load(open(IDS_PATH, "r", encoding="utf-8"))
class Query(BaseModel):
    embedding: list[float]; k: int = 20
@app.post("/search")
def search(q: Query):
    xq = np.array([q.embedding], dtype="float32")
    faiss.normalize_L2(xq)
    D, I = index.search(xq, q.k)
    return {"row_indexes": I[0].tolist(), "scores": D[0].tolist()}
@app.get("/ids")

def get_ids():
    return ids
```

**Run**:（compose で自動起動済 / 変更時は再起動）

```bash
docker compose restart faiss
curl http://127.0.0.1:8000/ids | head
```

**Done if**: JSON 配列が返る。

---

## C5. E2E — OpenAI でクエリ埋め込み→FAISS→DB 確認

**Goal**: 端から端まで 5件ヒット。
**Touch**: `scripts/test-faiss-query-openai.ts`

```ts
// scripts/test-faiss-query-openai.ts
import OpenAI from "openai"; import { Client } from "pg";
const MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
async function main(){
  const q = process.argv.slice(2).join(" ") || "支払い 失敗";
  const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const emb = (await ai.embeddings.create({ model: MODEL, input: q })).data[0].embedding;
  const faiss = await fetch(process.env.FAISS_URL + "/search",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ embedding: emb, k: 5 })}).then(r=>r.json());
  const ids: string[] = await fetch(process.env.FAISS_URL + "/ids").then(r=>r.json());
  const kuIds = (faiss.row_indexes as number[]).map(i=> ids[i]);
  const db = new Client({ connectionString: process.env.DATABASE_URL }); await db.connect();
  const { rows } = await db.query("SELECT id,title,LEFT(body,120) AS snippet FROM knowledge_units WHERE id = ANY($1)",[kuIds]);
  await db.end();
  console.log("Query:", q); rows.forEach((r:any,i:number)=>{ console.log(`${i+1}. ${r.title}\n   ${r.snippet}\n`); });
}
main().catch(e=>{console.error(e); process.exit(1);});
```

**Run**:

```bash
pnpm tsx scripts/test-faiss-query-openai.ts "支払い 失敗"
```

**Done if**: タイトル5件が表示。

---

## C6. NextAPI — /api/vector-search を OpenAI 版に

**Goal**: UI から意味検索が通る。
**Touch**: `apps/web/app/api/vector-search/route.ts`, `apps/web/src/lib/embed.ts`

```ts
// apps/web/src/lib/embed.ts
import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
export async function embed(text: string){
  const r = await client.embeddings.create({ model: MODEL, input: text.slice(0,6000) });
  return r.data[0].embedding as number[];
}
```

```ts
// apps/web/app/api/vector-search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client"; import { embed } from "@/lib/embed";
export async function POST(req: NextRequest){
  const { query, k = 20 } = await req.json();
  const v = await embed(query);
  const faissUrl = process.env.FAISS_URL || "http://127.0.0.1:8000";
  const faiss = await fetch(`${faissUrl}/search`,{ method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ embedding: v, k }) }).then(r=>r.json());
  const ids: string[] = await fetch(`${faissUrl}/ids`).then(r=>r.json());
  const kuIds = (faiss.row_indexes as number[]).map((i)=> ids[i]);
  const rows:any[] = await db.execute(
    `SELECT id,title,body,source_type,product,channel,updated_at FROM knowledge_units WHERE id = ANY($1)`,[kuIds]
  );
  const byId = new Map(rows.map((r:any)=>[r.id,r]));
  return NextResponse.json(kuIds.map(id=>byId.get(id)).filter(Boolean));
}
```

**Run**:

```bash
pnpm --filter apps/web dev
# UIのトグルを「ベクター」にして検索
```

**Done if**: UI に結果が並ぶ。

---

## C7. Metrics — p95 計測 & 表示

**Goal**: `public/metrics.json` を生成して UI のチップで表示。
**Touch**: `scripts/bench.sh`（任意）, `public/metrics.json`, UI
**Run**:

```bash
# 例: autocannon
npx autocannon -d 20 -c 50 "http://localhost:3000/api/search?q=カード エラー"
# 数値を public/metrics.json に反映
```

**Done if**: 右上チップに `通常 p95: xxxms / ベクター p95: yyyms`。

---

## C8. Polish — UI改善と体験強化

**Goal**: UI の細部を整えて本番品質へ近づける。  
**Touch**: コンポーネントやスタイル調整。  
**Tasks**:
- 検索中インジケータ、エラーUIの統一。
- 検索結果のハイライト表示。
- a11y（キーボード操作、スクリーンリーダー対応）。
- SEO / i18n の基礎（タイトル・description, `next-intl` 導入）。

**Done if**: 主要操作がキーボードで完結し、エラーやロード状態も自然に見える。

---

## C9. Report — 技術レポート化 & テスト

**Goal**: 実装過程と成果を「技術レポート（REPORT.md）」として生成し、面接やレビューで利用できる状態にする。さらに smoke テスト・型チェックを実行して、レポート内容と実装が一致していることを保証する。  

**Touch**: 
- `scripts/generate-report.ts` → 環境情報・p95結果・DB/FAISS状況を集約し `REPORT.md` を自動生成  
- `scripts/smoke-api.sh` → API（/api/search, /api/vector-search, FAISS /ids）のスモークテスト  
- `REPORT.md`（生成物）  

**Tasks**:
- 設計: なぜ Next.js + OpenAI Embeddings + FAISS を選んだかを記述。  
- 実装: 各工程（C1–C8）の要点とトラブルシュートを整理。  
- 性能: `apps/public/metrics.json` の p95 計測値を取り込み、通常検索との比較を明示。  
- 運用: Docker 構成、環境変数管理（`.env.local`）、コスト見積もり。  
- テスト: `scripts/smoke-api.sh` により最低限の API 動作を確認、`pnpm typecheck` / `pnpm lint` で品質を担保。  

**Done if**:  
- リポジトリに `REPORT.md` が生成され、p95 値やシステム構成が明記されている。  
- `./scripts/smoke-api.sh` が成功し、通常検索とベクター検索の両方で結果が返る。  
- 型チェック/リンタがエラーなく完了する。  

---
---
C10. Theming — Light/Dark 両対応（アクセシブル）

Goal
	•	ライト/ダークの両モードで見やすい配色（WCAG AA 4.5:1）を全UIへ適用。
	•	システム設定（prefers-color-scheme）を初期値に、トグルで手動切替＋永続化。
	•	既存の色クラスを セマンティックトークン（background/card/foreground/border/muted/...）へ置換。

Touch
	•	apps/tailwind.config.ts（darkMode: "class", colors拡張）
	•	apps/app/globals.css（CSS変数：:root / .dark）
	•	apps/src/providers/theme-provider.tsx（next-themes）
	•	apps/src/components/ThemeToggle.tsx（トグル）
	•	各UIの色クラス置換（ヘッダー/結果リスト/プレビュー 等）

Run

# 0) 依存導入
cd apps
pnpm add next-themes

# 1) tailwind.config.ts でセマンティックカラー定義
#  darkMode は class のまま。colors に CSS変数バインドを追加する。
#  例:
#  extend: { colors: { background:"hsl(var(--background))", foreground:"hsl(var(--foreground))", card:"hsl(var(--card))", cardForeground:"hsl(var(--card-foreground))", muted:"hsl(var(--muted))", mutedForeground:"hsl(var(--muted-foreground))", border:"hsl(var(--border))", ring:"hsl(var(--ring))", accent:"hsl(var(--accent))", accentForeground:"hsl(var(--accent-foreground))", destructive:"hsl(var(--destructive))", destructiveForeground:"hsl(var(--destructive-foreground))" }}}

# 2) app/globals.css に CSS変数を追加
#  :root（Light） と .dark（Dark）で HSL を定義。AA を満たすように値は下記の目安。
#  Light:
#    --background: 0 0% 100%;
#    --foreground: 222 47% 11%;
#    --card: 0 0% 100%;
#    --card-foreground: 222 47% 11%;
#    --muted: 220 16% 96%;
#    --muted-foreground: 220 9% 46%;
#    --border: 220 13% 91%;
#    --ring: 221 83% 53%;
#    --accent: 221 83% 53%;
#    --accent-foreground: 0 0% 100%;
#    --destructive: 0 65% 48%;
#    --destructive-foreground: 0 0% 100%;
#  Dark:
#    --background: 222 47% 7%;
#    --foreground: 210 40% 98%;
#    --card: 222 47% 9%;
#    --card-foreground: 210 40% 98%;
#    --muted: 222 37% 12%;
#    --muted-foreground: 220 10% 65%;
#    --border: 220 25% 20%;
#    --ring: 221 83% 70%;
#    --accent: 221 83% 66%;
#    --accent-foreground: 222 47% 7%;
#    --destructive: 0 72% 60%;
#    --destructive-foreground: 222 47% 7%;
#  さらに:
#    @layer base { html{ color-scheme: light dark } body{@apply bg-background text-foreground} *{@apply border-border} }

# 3) src/providers/theme-provider.tsx を追加（next-themes）
#  "use client";
#  import { ThemeProvider as NextThemesProvider } from "next-themes";
#  export default function ThemeProvider({ children }:{children:React.ReactNode}) {
#    return <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>{children}</NextThemesProvider>;
#  }

# 4) app/layout.tsx（or app/[locale]/layout.tsx）に ThemeProvider を組込む
#  <html lang="ja" suppressHydrationWarning><body><ThemeProvider>{children}</ThemeProvider></body></html>

# 5) src/components/ThemeToggle.tsx を追加（トグル）
#  "use client";
#  import { useTheme } from "next-themes";
#  export default function ThemeToggle(){
#    const { theme, setTheme, systemTheme } = useTheme();
#    const effective = theme === "system" ? systemTheme : theme;
#    const next = effective === "dark" ? "light" : "dark";
#    return <button aria-label="テーマ切替" className="rounded-xl border px-3 py-1 text-sm hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring" onClick={()=>setTheme(next)}>{effective==="dark"?"☀️ Light":"🌙 Dark"}</button>;
#  }

# 6) ヘッダー等に ThemeToggle を設置
#  例: 右上の操作群に <ThemeToggle /> を追加。背景は bg-card、テキストは text-foreground に統一。

# 7) 既存色クラスの置換（代表例）
#  bg-white         -> bg-card
#  bg-gray-50       -> bg-background
#  text-gray-900    -> text-foreground
#  text-gray-600/500-> text-muted-foreground
#  border（色未指定）-> そのまま（CSS変数で反映）
#  プライマリボタン -> bg-accent text-accent-foreground hover:opacity-90

Check

pnpm dev
# 1) OSのダーク/ライト切替で自動追従
# 2) ヘッダのトグルで手動切替・再読込後も保持（localStorage）
# 3) 各コンポーネントのコントラストが AA 準拠（本文/見出し/ボーダ）

Done if
	•	ライト/ダーク両方で破綻なく読める（背景・文字・境界のコントラスト良好）。
	•	トグルで即時切替でき、再読み込み後も選択が保持される。
	•	フォーカスリング（focus:ring-ring）が視認できる。
---

### トラブルシュート

- **DIM 不一致**: OpenAI `text-embedding-3-small` = 1536次元。`build_index.py` / `server.py` の `DIM=1536` に統一。  
- **429 / Rate Limit**: Embedding 生成時は `BATCH=50` に縮小し、指数バックオフを実装。  
- **コスト抑制**: `text-embedding-3-small` を利用。文書を 4–6K 文字に切り詰める。  
- **CORS / URL**: 開発時は `FAISS_URL=http://127.0.0.1:8000`、本番は `http://faiss:8000`。  
- **データ差異**: DBをリシード後は必ず `make-embeddings-openai.ts → build_index.py → restart faiss` の順で再生成。  
---

# 付録：通常検索 API（参考）

```ts
// apps/web/app/api/search/route.ts（概略）
import { NextRequest, NextResponse } from "next/server"; import { db } from "@/db/client";
export async function GET(req: NextRequest){
  const q = req.nextUrl.searchParams.get("q") || ""; if(!q) return NextResponse.json([]);
  const res:any[] = await db.execute(
    `SELECT id,title,body,source_type,product,channel,updated_at
     FROM knowledge_units WHERE title ILIKE $1 OR body ILIKE $1
     ORDER BY updated_at DESC LIMIT 20`, [`%${q}%`]);
  return NextResponse.json(res);
}
```
