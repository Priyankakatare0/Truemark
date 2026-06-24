# backend/services/similarity.py

import json
import imagehash
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from db import supabase_client
from core.logging import logger


class SimilaritySearchError(Exception):
    """Raised when similarity search fails."""


def _parse_vector(v) -> list[float]:
    """
    Supabase PostgREST returns VECTOR columns as a JSON string like
    '[0.047, -0.002, ...]' instead of an actual list. This helper normalises
    both representations into a plain Python list of floats.
    """
    if isinstance(v, str):
        return json.loads(v)
    return list(v)


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
        query_vector = _parse_vector(query_vector)
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
        try:
            parsed_vector = _parse_vector(vector)
        except (ValueError, TypeError) as parse_err:
            logger.warning("Skipping record %s — bad clip_vector: %s", fid, parse_err)
            continue
        scored.append(
            {
                "fingerprint_id": fid,
                "file_name": record.get("file_name", "unknown"),
                "similarity_score": _cosine_sim(query_vector, parsed_vector),
                "is_sample": bool(record.get("is_sample", False)),
            }
        )

    scored.sort(key=lambda x: x["similarity_score"], reverse=True)
    return scored[:limit]


def _boost_phash_matches(matches: list[dict], query_phash: str) -> list[dict]:
    """Boost CLIP scores when perceptual hashes are very close."""
    if not matches:
        return matches

    ids = [m.get("fingerprint_id", m.get("id")) for m in matches]
    phash_map: dict[str, str] = {}

    for fid in ids:
        record = supabase_client.get_fingerprint_by_id(fid)
        if record and record.get("phash"):
            phash_map[fid] = record["phash"]

    boosted = []
    for match in matches:
        score = float(match["similarity_score"])
        ph = phash_map.get(match.get("fingerprint_id", match.get("id")))
        if ph:
            dist = _phash_distance(query_phash, ph)
            if dist <= 5:
                score = min(1.0, score + 0.15)
            elif dist <= 10:
                score = min(1.0, score + 0.08)
        boosted.append({**match, "similarity_score": score})

    boosted.sort(key=lambda x: x["similarity_score"], reverse=True)
    return boosted


# Minimum cosine similarity to consider a match "relevant".
# CLIP vectors of completely unrelated images can still score 0.2–0.5,
# so we ignore anything below this threshold to avoid false low-originality scores.
_SIMILARITY_THRESHOLD = 0.75


def compute_originality_score(matches: list[dict]) -> float:
    """
    Originality is determined by the single most-similar other image found.
    Only matches above the relevance threshold are considered.
    - 0 relevant matches  → 100% original
    - Best match >= thresh → 0% original (exact copy)
    """
    relevant = [m for m in matches if float(m["similarity_score"]) >= _SIMILARITY_THRESHOLD]
    if not relevant:
        return 100.0
    
    # The user requested that the similarity score should become either 0 or 100, not anything between.
    # Therefore, if there is ANY relevant match above the threshold, it is considered 
    # a duplicate (100% similar), meaning it is 0% original.
    return 0.0
