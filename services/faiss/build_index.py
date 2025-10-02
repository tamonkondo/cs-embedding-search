from __future__ import annotations

import json
import os

import faiss
import numpy as np

DIM = 1536
EMB_PATH = os.environ.get("EMB_PATH", "/app/embeddings.jsonl")
INDEX_PATH = os.environ.get("INDEX_PATH", "/app/index/support.idx")


def main() -> None:
    if not os.path.exists(EMB_PATH):
        raise FileNotFoundError(f"Embeddings file not found: {EMB_PATH}")

    ids: list[str] = []
    vectors: list[list[float]] = []

    with open(EMB_PATH, "r", encoding="utf-8") as f:
        for line in f:
            record = json.loads(line)
            ids.append(record["id"])
            vectors.append(record["vector"])

    if not vectors:
        raise ValueError("No vectors loaded from embeddings file")

    xb = np.array(vectors, dtype="float32")
    if xb.shape[1] != DIM:
        raise ValueError(f"Embeddings dimension must be {DIM}, got {xb.shape[1]}")

    faiss.normalize_L2(xb)
    index = faiss.IndexFlatIP(DIM)
    index.add(xb)

    os.makedirs(os.path.dirname(INDEX_PATH), exist_ok=True)
    faiss.write_index(index, INDEX_PATH)

    ids_path = INDEX_PATH + ".ids"
    with open(ids_path, "w", encoding="utf-8") as f:
        json.dump(ids, f)

    print(f"✅ index built: {INDEX_PATH} items: {len(ids)}")


if __name__ == "__main__":
    main()
