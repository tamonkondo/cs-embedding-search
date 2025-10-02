from __future__ import annotations

import json
import os
from typing import List

import faiss
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

DIM = 1536
INDEX_PATH = os.environ.get("INDEX_PATH", "/app/index/support.idx")
IDS_PATH = os.environ.get("IDS_PATH", INDEX_PATH + ".ids")


class Query(BaseModel):
    embedding: List[float]
    k: int = 20


app = FastAPI(title="Support Search FAISS API")


def _load_index():
    if not os.path.exists(INDEX_PATH):
        raise FileNotFoundError(
            f"FAISS index missing at {INDEX_PATH}. Run build_index.py first."
        )
    if not os.path.exists(IDS_PATH):
        raise FileNotFoundError(
            f"FAISS ids file missing at {IDS_PATH}. Run build_index.py first."
        )

    index = faiss.read_index(INDEX_PATH)
    with open(IDS_PATH, "r", encoding="utf-8") as f:
        ids = json.load(f)
    return index, ids


@app.on_event("startup")
def startup_event():
    global index, ids
    index, ids = _load_index()


@app.post("/search")
def search(q: Query):
    if not q.embedding:
        raise HTTPException(status_code=400, detail="embedding is required")

    xq = np.array([q.embedding], dtype="float32")
    if xq.shape[-1] != DIM:
        raise HTTPException(status_code=400, detail=f"embedding dimension must be {DIM}")

    faiss.normalize_L2(xq)
    distances, indices = index.search(xq, q.k)
    return {
        "row_indexes": indices[0].tolist(),
        "scores": distances[0].tolist(),
    }


@app.get("/ids")
def get_ids():
    return ids
