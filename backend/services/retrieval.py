import urllib.request
import json
import numpy as np
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.config import settings
from backend.services.catalog import get_service_catalog

# In-memory cache for service embeddings (fallback / fast lookups)
_CATALOG_EMBEDDINGS: Dict[str, List[float]] = {}

def _cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Compute cosine similarity between two dense embedding vectors."""
    a = np.array(v1, dtype=float)
    b = np.array(v2, dtype=float)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    raw_sim = float(np.dot(a, b) / (norm_a * norm_b))
    return float(max(0.0, min(1.0, raw_sim)))

def _generate_gemini_embedding(text: str) -> List[float]:
    """Generate dense vector embedding using Google Gemini gemini-embedding-001 API."""
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured in .env file.")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={settings.GEMINI_API_KEY}"
    payload = json.dumps({
        "model": "models/gemini-embedding-001",
        "content": {
            "parts": [{"text": text[:2048]}]
        }
    }).encode("utf-8")

    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["embedding"]["values"]
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        raise RuntimeError(f"Gemini Embedding API Error ({e.code}): {err_body}")
    except Exception as e:
        raise RuntimeError(f"Network error connecting to Gemini Embedding API: {str(e)}")

def get_text_embedding(text: str) -> List[float]:
    """Fetch dense embedding directly from Google Gemini gemini-embedding-001."""
    return _generate_gemini_embedding(text)

def initialize_catalog_embeddings(db: Optional[Session] = None):
    """
    Pre-compute and persist vector embeddings for all 8 catalog services.
    Saves vectors to PostgreSQL via pgvector when available, and caches in memory.
    """
    global _CATALOG_EMBEDDINGS
    catalog = get_service_catalog()

    for service in catalog:
        content_to_embed = f"{service['name']}. {service['search_context']}"
        vec = get_text_embedding(content_to_embed)
        _CATALOG_EMBEDDINGS[service["id"]] = vec

        # If PostgreSQL DB session is provided, persist vector directly into pgvector column
        if db is not None:
            try:
                # Format vector string for pgvector literal
                vec_str = "[" + ",".join(str(x) for x in vec) + "]"
                db.execute(
                    text("UPDATE services SET embedding = :embedding WHERE id = :id"),
                    {"embedding": vec_str, "id": service["id"]}
                )
            except Exception:
                pass
    if db is not None:
        try:
            db.commit()
        except Exception:
            pass

def retrieve_matching_services(transcript: str, top_k: int = 4, db: Optional[Session] = None) -> List[Dict[str, Any]]:
    """
    Perform dense vector retrieval against the service catalog using Gemini embeddings.
    Queries PostgreSQL pgvector with SQL cosine distance (<=>) when DB is available,
    falling back seamlessly to in-memory cosine similarity.
    """
    global _CATALOG_EMBEDDINGS
    if not _CATALOG_EMBEDDINGS:
        initialize_catalog_embeddings(db)

    transcript_embedding = get_text_embedding(transcript)

    # 1. Try PostgreSQL pgvector search
    if db is not None:
        try:
            vec_str = "[" + ",".join(str(x) for x in transcript_embedding) + "]"
            sql = text("""
                SELECT id, name, description, 1 - (embedding <=> CAST(:query_vec AS vector)) AS sim
                FROM services
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> CAST(:query_vec AS vector)
                LIMIT :top_k
            """)
            result = db.execute(sql, {"query_vec": vec_str, "top_k": top_k}).fetchall()
            if result and len(result) > 0:
                return [
                    {
                        "service_id": row[0],
                        "service_name": row[1],
                        "description": row[2],
                        "similarity_score": round(float(row[3]), 3)
                    }
                    for row in result
                ]
        except Exception:
            try:
                db.rollback()
            except Exception:
                pass

    # 2. Fallback: In-memory numpy cosine similarity
    catalog = get_service_catalog()
    results = []

    for service in catalog:
        s_id = service["id"]
        s_vec = _CATALOG_EMBEDDINGS.get(s_id)
        if s_vec:
            score = _cosine_similarity(transcript_embedding, s_vec)
        else:
            score = 0.0

        results.append({
            "service_id": s_id,
            "service_name": service["name"],
            "description": service["description"],
            "similarity_score": round(score, 3)
        })

    results.sort(key=lambda x: x["similarity_score"], reverse=True)
    return results[:top_k]
