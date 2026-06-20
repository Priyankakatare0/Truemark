# backend/tests/test_similarity.py

import numpy as np

from services.similarity import compute_originality_score, _cosine_sim


def test_cosine_similarity_identical():
    vec = np.random.rand(512).tolist()
    assert _cosine_sim(vec, vec) == 1.0


def test_originality_score_no_matches():
    assert compute_originality_score([]) == 100.0


def test_originality_score_with_matches():
    matches = [{"similarity_score": 0.8}, {"similarity_score": 0.6}]
    score = compute_originality_score(matches)
    assert score == 30.0
