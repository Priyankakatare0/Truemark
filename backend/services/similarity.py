# backend/services/similarity.py

import imagehash
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from db import supabase_client
from core.logging import logger


class SimilaritySearchError(Exception):
    """Raised when similarity search fails."""


def _cosine_sim(a: list[float], b: list[float]) -> float:
    va = np.array(a, dtype=np.float32).reshape(1, -1)
    vb = np.array(b, dtype=np.float32).reshape(1, -1)
    return float(cosine_similarity(va, vb)[0][0])


def _phash_distance(phash_a: str, phash_b: str) -> int:
    try:
        return imagehash.hex_to_hash(phash_a) - imagehash.hex_to_hash(phash_b)
    except Exception:
        return 999


def find_similar_images(
    query_vector: list[float],
    exclude_id: str | None = None,
    limit: int = 10,
    query_phash: str | None = None,
) -> list[dict]:
    """
    Find top similar fingerprints using pgvector RPC with Python fallback.
    Boosts near-duplicate pHash matches for cropped/resized variants.
    """
    try:
        matches = supabase_client.native_vector_search(
            query_vector, match_count=limit, exclude_id=exclude_id
        )

        if not matches:
            matches = _python_vector_search(query_vector, exclude_id=exclude_id, limit=limit)

        if query_phash:
            matches = _boost_phash_matches(matches, query_phash)

        return matches[:limit]
    except Exception as e:
        logger.error("Similarity search failed: %s", e, exc_info=True)
        raise SimilaritySearchError(str(e)) from e


def _python_vector_search(
    query_vector: list[float],
    exclude_id: str | None = None,
    limit: int = 10,
) -> list[dict]:
    """Fallback cosine similarity over all stored vectors."""
    records = supabase_client.get_all_fingerprint_vectors()
    scored: list[dict] = []

    for record in records:
        fid = record.get("id")
        if exclude_id and fid == exclude_id:
            continue
        vector = record.get("clip_vector")
        if not vector:
            continue
        scored.append(
            {
                "fingerprint_id": fid,
                "file_name": record.get("file_name", "unknown"),
                "similarity_score": _cosine_sim(query_vector, vector),
                "is_sample": bool(record.get("is_sample", False)),
            }
        )

    scored.sort(key=lambda x: x["similarity_score"], reverse=True)
    return scored[:limit]


def _boost_phash_matches(matches: list[dict], query_phash: str) -> list[dict]:
    """Boost CLIP scores when perceptual hashes are very close."""
    if not matches:
        return matches

    ids = [m["fingerprint_id"] for m in matches]
    phash_map: dict[str, str] = {}

    for fid in ids:
        record = supabase_client.get_fingerprint_by_id(fid)
        if record and record.get("phash"):
            phash_map[fid] = record["phash"]

    boosted = []
    for match in matches:
        score = float(match["similarity_score"])
        ph = phash_map.get(match["fingerprint_id"])
        if ph:
            dist = _phash_distance(query_phash, ph)
            if dist <= 5:
                score = min(1.0, score + 0.15)
            elif dist <= 10:
                score = min(1.0, score + 0.08)
        boosted.append({**match, "similarity_score": score})

    boosted.sort(key=lambda x: x["similarity_score"], reverse=True)
    return boosted


def compute_originality_score(matches: list[dict]) -> float:
    """100 minus average similarity of top matches, or 100 if none."""
    if not matches:
        return 100.0
    avg_similarity = sum(float(m["similarity_score"]) for m in matches) / len(matches)
    return max(0.0, min(100.0, round((1 - avg_similarity) * 100, 1)))
