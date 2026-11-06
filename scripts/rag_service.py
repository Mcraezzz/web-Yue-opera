from __future__ import annotations

import argparse
import json
import os
import uuid
from pathlib import Path
from typing import Any

import pymysql
import uvicorn
from fastapi import FastAPI, Request
from pydantic import BaseModel
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams
from sentence_transformers import CrossEncoder, SentenceTransformer


ROOT = Path(__file__).resolve().parents[1]
ENV = ROOT / ".env"
MODELS = ROOT / "models"
DATA = ROOT / "data"
QDRANT_PATH = DATA / "qdrant-rag"
COLLECTION = "yueju_knowledge"

PLAY_TERMS = [
    "梁山伯与祝英台",
    "梁祝",
    "红楼梦",
    "西厢记",
    "祥林嫂",
    "碧玉簪",
    "追鱼",
    "五女拜寿",
    "何文秀",
    "玉堂春",
]

SCHOOL_TERMS = [
    "袁派",
    "尹派",
    "范派",
    "傅派",
    "徐派",
    "王派",
    "吕派",
    "金派",
    "张派",
    "戚派",
    "小生",
    "旦角",
    "花旦",
]


class SearchRequest(BaseModel):
    query: str
    category: str = "全部"
    limit: int = 8


class RagEngine:
    def __init__(self) -> None:
        env = load_env()
        self.embedding_model_path = Path(env.get("RAG_EMBEDDING_MODEL", MODELS / "bge-m3"))
        self.reranker_model_path = Path(env.get("RAG_RERANKER_MODEL", MODELS / "bge-reranker-v2-m3"))
        self.collection = env.get("RAG_QDRANT_COLLECTION", COLLECTION)
        self.qdrant_path = Path(env.get("RAG_QDRANT_PATH", QDRANT_PATH))
        self.embedding_model: SentenceTransformer | None = None
        self.reranker: CrossEncoder | None = None
        self.client: QdrantClient | None = None
        self.chunks: list[dict[str, Any]] = []

    def load(self) -> None:
        if self.embedding_model is None:
            self.embedding_model = SentenceTransformer(str(self.embedding_model_path), trust_remote_code=True)
        if self.reranker is None and self.reranker_model_path.exists():
            try:
                self.reranker = CrossEncoder(str(self.reranker_model_path), trust_remote_code=True)
            except Exception:
                self.reranker = None
        if self.client is None:
            self.qdrant_path.mkdir(parents=True, exist_ok=True)
            self.client = QdrantClient(path=str(self.qdrant_path))
        self.ensure_index()

    def ensure_index(self) -> None:
        assert self.client is not None
        self.chunks = load_chunks()
        if not self.chunks:
            return

        if self._collection_ready():
            return
        self.rebuild_index()

    def rebuild_index(self) -> None:
        assert self.embedding_model is not None
        assert self.client is not None

        self.chunks = load_chunks()
        if not self.chunks:
            return

        texts = [chunk["searchText"] for chunk in self.chunks]
        vectors = self.embedding_model.encode(
            texts,
            batch_size=8,
            normalize_embeddings=True,
            show_progress_bar=True,
        )
        size = int(vectors.shape[1])
        if self._collection_exists():
            self.client.delete_collection(self.collection)
        self.client.create_collection(
            collection_name=self.collection,
            vectors_config=VectorParams(size=size, distance=Distance.COSINE),
        )
        points = []
        for chunk, vector in zip(self.chunks, vectors):
            points.append(PointStruct(
                id=str(uuid.uuid5(uuid.NAMESPACE_URL, chunk["id"])),
                vector=vector.tolist(),
                payload=chunk,
            ))
        self.client.upsert(collection_name=self.collection, points=points)

    def search(self, query: str, category: str = "全部", limit: int = 8) -> list[dict[str, Any]]:
        self.load()
        assert self.embedding_model is not None
        assert self.client is not None

        clean_query = (query or "").strip()
        if not clean_query:
            return []

        safe_limit = max(1, min(int(limit or 8), 20))
        query_vector = self.embedding_model.encode(clean_query, normalize_embeddings=True).tolist()
        candidates = self._qdrant_search(query_vector, category, max(safe_limit * 4, 12))
        if not candidates:
            return []

        hits = []
        for point in candidates:
            payload = dict(point.payload or {})
            payload["score"] = round(float(getattr(point, "score", 0.0) or 0.0), 4)
            payload["matchedBy"] = "bge-m3 向量召回"
            hits.append(payload)

        if self.reranker is not None and hits:
            pairs = [(clean_query, hit["searchText"]) for hit in hits]
            scores = self.reranker.predict(pairs)
            for hit, score in zip(hits, scores):
                hit["score"] = round(float(score), 4)
                hit["matchedBy"] = "bge-reranker-v2-m3 重排"
            hits.sort(key=lambda item: item["score"], reverse=True)

        return hits[:safe_limit]

    def _qdrant_search(self, vector: list[float], category: str, limit: int) -> list[Any]:
        assert self.client is not None
        try:
            result = self.client.query_points(
                collection_name=self.collection,
                query=vector,
                limit=limit,
                with_payload=True,
            )
            points = list(result.points)
        except Exception:
            points = self.client.search(
                collection_name=self.collection,
                query_vector=vector,
                limit=limit,
                with_payload=True,
            )

        selected_category = (category or "全部").strip()
        if selected_category == "全部":
            return points
        filtered_points = [
            point for point in points
            if str((point.payload or {}).get("category", "")).strip() == selected_category
        ]
        return filtered_points or points

    def _collection_exists(self) -> bool:
        assert self.client is not None
        try:
            return self.client.collection_exists(self.collection)
        except Exception:
            try:
                self.client.get_collection(self.collection)
                return True
            except Exception:
                return False

    def _collection_ready(self) -> bool:
        assert self.client is not None
        if not self._collection_exists():
            return False
        try:
            info = self.client.get_collection(self.collection)
            points_count = int(info.points_count or 0)
            return points_count >= max(1, len(self.chunks))
        except Exception:
            return False


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    if ENV.exists():
        for line in ENV.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            env[key.strip()] = value.strip().strip('"').strip("'")
    return {**env, **os.environ}


def load_chunks() -> list[dict[str, Any]]:
    chunks = load_db_chunks()
    chunks.extend(load_aria_chunks())
    return chunks


def load_db_chunks() -> list[dict[str, Any]]:
    env = load_env()
    connection = pymysql.connect(
        host=env.get("DB_HOST", "127.0.0.1"),
        port=int(env.get("DB_PORT", "3306")),
        user=env.get("DB_USER", "root"),
        password=env.get("DB_PASSWORD", "password"),
        database=env.get("DB_NAME", "web_yueju"),
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
    )
    try:
        chunks: list[dict[str, Any]] = []
        with connection.cursor() as cursor:
            cursor.execute("SELECT id, title, category, description FROM plays ORDER BY sort_order ASC, id ASC")
            for row in cursor.fetchall():
                chunks.append(make_chunk(
                    f"play-{row['id']}",
                    row["title"],
                    "剧目",
                    row["description"],
                    "/repertoire",
                    "剧目库",
                ))

            cursor.execute("SELECT id, title, category, summary, source_url FROM news ORDER BY sort_order ASC, id ASC")
            for row in cursor.fetchall():
                chunks.append(make_chunk(
                    f"news-{row['id']}",
                    row["title"],
                    "新闻",
                    row["summary"],
                    "/news",
                    f"新闻资讯·{row['category']}",
                ))

            cursor.execute("SELECT id, title, category, description FROM search_items ORDER BY sort_order ASC, id ASC")
            for row in cursor.fetchall():
                chunks.append(make_chunk(
                    f"search-{row['id']}",
                    row["title"],
                    row["category"],
                    row["description"],
                    route_for(row["category"], row["title"]),
                    "知识条目",
                ))
        return chunks
    finally:
        connection.close()


def load_aria_chunks() -> list[dict[str, Any]]:
    file_path = DATA / "classic-arias.json"
    if not file_path.exists():
        return []
    try:
        data = json.loads(file_path.read_text(encoding="utf-8"))
    except Exception:
        return []

    chunks = []
    for index, item in enumerate(data.get("items", []), start=1):
        analysis = item.get("analysis") or {}
        desc_parts = [
            analysis.get("summary", ""),
            analysis.get("background", ""),
            analysis.get("actors", ""),
            analysis.get("school", ""),
            analysis.get("technique", ""),
            analysis.get("plot", ""),
            analysis.get("emotion", ""),
        ]
        chunks.append(make_chunk(
            f"aria-{index}",
            item.get("title", f"经典唱段 {index}"),
            "唱腔",
            " ".join(part for part in desc_parts if part),
            "/repertoire",
            "经典唱段分析",
        ))
    return chunks


def make_chunk(chunk_id: str, title: str, category: str, desc: str, path: str, source: str) -> dict[str, Any]:
    text = f"{title} {category} {desc} {source}"
    return {
        "id": chunk_id,
        "title": title or "",
        "category": category or "",
        "desc": desc or "",
        "path": path or "/",
        "source": source or "站内知识库",
        "searchText": text,
        "relatedPlays": related_terms(text, PLAY_TERMS),
        "relatedSchools": related_terms(text, SCHOOL_TERMS),
    }


def related_terms(text: str, terms: list[str]) -> list[str]:
    normalized = text or ""
    values = [term for term in terms if term in normalized]
    return values[:5]


def route_for(category: str, title: str) -> str:
    value = f"{category or ''} {title or ''}"
    if "剧目" in value or "梁祝" in value or "红楼梦" in value:
        return "/repertoire"
    if "新闻" in value:
        return "/news"
    if "流派" in value or "演员" in value or "唱腔" in value:
        return "/schools"
    if "历史" in value:
        return "/scroll"
    if "舞台" in value or "服饰" in value:
        return "/backstage"
    if "视频" in value:
        return "/repertoire"
    return "/"


app = FastAPI(title="Yueju RAG Service")
engine = RagEngine()


@app.on_event("startup")
def startup() -> None:
    engine.load()


@app.get("/health")
def health() -> dict[str, Any]:
    engine.load()
    return {
        "ok": True,
        "collection": engine.collection,
        "chunks": len(engine.chunks),
        "embeddingModel": str(engine.embedding_model_path),
        "rerankerModel": str(engine.reranker_model_path),
        "rerankerReady": engine.reranker is not None,
    }


@app.post("/search")
async def search(request: Request) -> dict[str, Any]:
    try:
        data = await request.json()
    except Exception:
        data = {}
    query = str(data.get("query") or data.get("keyword") or "").strip()
    category = str(data.get("category") or "全部").strip()
    try:
        limit = int(data.get("limit") or 8)
    except Exception:
        limit = 8
    return {"items": engine.search(query, category, limit)}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--build", action="store_true", help="rebuild vector index and exit")
    parser.add_argument("--host", default=os.environ.get("RAG_HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("RAG_PORT", "8091")))
    args = parser.parse_args()

    if args.build:
        engine.load()
        engine.rebuild_index()
        print(json.dumps({"ok": True, "chunks": len(engine.chunks), "collection": engine.collection}, ensure_ascii=False))
        return

    uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
