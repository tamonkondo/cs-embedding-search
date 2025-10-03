# カスタマーサポート検索 — 技術レポート

## 概要
- **目的**: FAQ・ナレッジを「通常検索」と「ベクター検索」で横断し、オペレーターの一次回答時間を短縮する。
- **成果**:
  - Postgres + `pg_trgm` による全文検索 API (`/api/search`).
  - OpenAI `text-embedding-3-small` + FAISS による意味検索 API (`/api/vector-search`).
  - Next.js UI からモード切替／フィルタ／プレビューを統合し、結果の詳細を即座に参照可能にした。
- **対応範囲**: C1–C8 の各カードを実装し、ダミーデータ投入〜UI 改修まで一貫した E2E 動線を整備。

## フォルダ構成
- **apps/**: Next.js 製の UI・API 群をまとめる領域。実動しているのは `apps/src/` で、App Router 配下に検索画面・プレビュー・テーマ設定・`/api/search` と `/api/vector-search` のエッジ関数を実装している。
- **scripts/**: ベクター検索パイプラインを運用する単発ツール置き場。`seed.ts` がダミーデータ投入、`make-embeddings-openai.ts` が OpenAI 埋め込みを生成、`test-faiss-query-openai.ts` が E2E 動作確認、`check-faiss-id.ts` がインデックスと DB の ID 整合性チェックを行う。
- **services/**: 機械学習系のバックエンドを集約する Python レイヤー。`services/faiss/` では FastAPI サーバ (`server.py`) とインデックスビルダー (`build_index.py`) を提供し、`embeddings.jsonl` を取り込んで `index/` 以下に最終成果物 `support.idx`（FAISS バイナリインデックス）と `support.idx.ids`（行番号→ドキュメント ID の対応表）を生成・保持する。

---

## 設計 — Next.js + OpenAI + FAISS を選んだ理由

| 項目 | 採用理由 |
| --- | --- |
| **Next.js (App Router)** | SSR とクライアント機能を両立しつつ、API ルートでバックエンドを最小限にまとめられる。Turbopack で開発体験が良好。|
| **OpenAI Embeddings** | `text-embedding-3-small` は 1536 次元でコスト対性能のバランスが良く、マルチリンガルにも十分。モデル提供は API 1 呼び出しで完結し、学習・ホスティングが不要。|
| **FAISS (IndexFlatIP)** | L2 正規化したベクトルに対して内積検索で高速に類似度算出。Docker 化が容易で、GPU 依存がない。|
| **Postgres + pg_trgm** | 既存構成に乗りやすく、N-gram で曖昧検索をサポート。通常検索のベースラインとして採用。|
| **Architecture** | Docker Compose で Postgres / FAISS をコンテナ化、Next.js はホスト実行。サービス間は HTTP/JSON で疎結合。Fallback として `@xenova/transformers` を維持し、API 障害時のバックアップルートに転用可能。|

---

## 実装ハイライト（C1–C8）

| カード | 内容 | 成果 |
| --- | --- | --- |
| **C1 Seed** | `scripts/seed.ts` で 1,200 件のダミーデータ生成。`pg_trgm` の index を作成。 | `knowledge_units` を十分なボリュームで初期化。|
| **C2 Embeddings** | `scripts/make-embeddings-openai.ts` で DB 全件を OpenAI Embeddings に変換し、`services/faiss/embeddings.jsonl` を出力。 | バッチ制御（デフォルト 100）と 6k 文字トリミングでレートリミット回避。|
| **C3 BuildIndex** | FAISS コンテナで `build_index.py` を実行し、`support.idx` を生成。 | `numpy==1.26.4` へのダウングレードで ABI 問題を解消。|
| **C4 FaissAPI** | FastAPI サーバ (`server.py`) を 1536 次元で起動。`/search` と `/ids` を提供。 | Docker Compose でホットリロード可能。|
| **C5 E2E** | `scripts/test-faiss-query-openai.ts` で OpenAI→FAISS→Postgres の疎通確認。 | CLI で検索語を指定し、上位 5 件のタイトルとスニペットを出力。|
| **C6 NextAPI** | `/api/search` と `/api/vector-search` を実装。OpenAI→FAISS→DB のロジックを API 化。 | ベクター API は JSON/form/text の 3 形式を許容し、エラー時に 400/502 を返す。|
| **C7 Metrics** | `public/metrics.json` と UI 表示を追加。 | プレビュー上部に `通常 p95: 165ms / ベクター p95: 245ms` を表示。|
| **C8 Polish** | next-intl による i18n、アクセシビリティ改善、プレビュー画面の実データ連携。 | 結果選択状態が維持され、プレビューにハイライト・メタ情報を表示。キーボード操作も考慮。|

---

## 性能 — p95 計測

| モード | p95 (ms) | 条件 |
| --- | --- | --- |
| 通常検索 | **165** | `pnpm dev` + `postgres@compose` 上で、`npx autocannon -d 20 -c 50 "http://localhost:3000/api/search?q=カード エラー"`. |
| ベクター検索 | **245** | 同条件で `/api/vector-search`。OpenAI 埋め込みがキャッシュされていないため若干高め。|

※ `public/metrics.json` に格納し、UI のプレビューパネルで常時表示。

---

## 運用・展開・コスト

- **Docker Compose**: Postgres と FAISS を分離。`postgres_data` ボリュームで永続化し、`faiss` はホットリロード可能。
- **Next.js 環境変数**: `.env.local` で `DATABASE_URL / FAISS_URL / OPENAI_API_KEY / EMBEDDING_MODEL` を管理。
- **OpenAI コスト試算**: 1,200 ドキュメント（最大 6K 文字）で数ドル。1,000 クエリでも数十セント程度。
- **フォールバック**: Transformers.js を保持し、OpenAI API 障害時のローカル推論への切替が可能。
- **TODO**: Embeddings 再生成の定期ジョブ化、Vector API の結果キャッシュ、OpenAI/FAISS/Postgres のメトリクス監視。

---

## 今後の改善
- **Ranking/Fusion**: 通常検索とベクター検索を RRF 等で融合し、ハイブリッドスコアを提供。
- **Feedback ループ**: 検索ログ・オペレーター評価を収集し、関連度改善や不足コンテンツを検出。
- **セキュリティ**: API キーの秘密管理、レートリミット、アクセスログのマスキング。
- **国際化拡張**: next-intl を活用し、英語以外のロケールと多言語 embeddings を追加。
- **UI 拡張**: 結果保存・共有、関連チケット表示、オペレーター向けショートカットの実装。

---

## 付録 — 実行コマンド
```bash
# コンテナ起動
docker compose up -d --build

# Seed
pnpm tsx scripts/seed.ts

# Embeddings 生成
pnpm tsx scripts/make-embeddings-openai.ts

# FAISS インデックス
docker compose run --rm faiss python build_index.py

# E2E テスト
pnpm tsx scripts/test-faiss-query-openai.ts "支払い 失敗"

# Next.js Dev
cd apps && pnpm dev
```
