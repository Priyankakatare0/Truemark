# backend/services/fingerprint.py

import hashlib

import imagehash
from PIL import Image
from sentence_transformers import SentenceTransformer

from core.logging import logger


class FingerprintGenerationError(Exception):
    """Raised when fingerprint generation fails."""


_model: SentenceTransformer | None = None


def load_model() -> None:
    """Load CLIP model at startup."""
    global _model
    if _model is None:
        logger.info("Loading CLIP model 'sentence-transformers/clip-ViT-B-32'...")
        try:
            _model = SentenceTransformer("sentence-transformers/clip-ViT-B-32")
            logger.info("CLIP model loaded successfully.")
        except Exception as e:
            logger.error("Failed to load CLIP model: %s", e, exc_info=True)
            raise FingerprintGenerationError(f"Failed to initialize CLIP model: {e}") from e


def generate_clip_embedding(image_path: str) -> list[float]:
    """Return a 512-dim CLIP embedding for the image."""
    global _model
    if _model is None:
        load_model()

    try:
        with Image.open(image_path) as image:
            rgb = image.convert("RGB")
            embedding = _model.encode(rgb, convert_to_numpy=True)
            return embedding.tolist()
    except Exception as e:
        logger.error("Failed to generate CLIP embedding for %s: %s", image_path, e, exc_info=True)
        raise FingerprintGenerationError(f"CLIP embedding generation failed: {e}") from e


def generate_phash(image_path: str) -> str:
    """Return perceptual hash hex string."""
    try:
        with Image.open(image_path) as img:
            return str(imagehash.phash(img))
    except Exception as e:
        logger.error("Failed to generate pHash for %s: %s", image_path, e, exc_info=True)
        raise FingerprintGenerationError(f"pHash generation failed: {e}") from e


def compute_file_hash(image_path: str) -> str:
    """Compute SHA256 of raw file bytes."""
    sha256 = hashlib.sha256()
    try:
        with open(image_path, "rb") as f:
            while chunk := f.read(8192):
                sha256.update(chunk)
        return sha256.hexdigest()
    except Exception as e:
        logger.error("Failed to compute file hash for %s: %s", image_path, e, exc_info=True)
        raise FingerprintGenerationError(f"File hash computation failed: {e}") from e


def generate_fingerprint(image_path: str) -> dict:
    """Generate file hash, pHash, and CLIP vector."""
    try:
        return {
            "file_hash": compute_file_hash(image_path),
            "phash": generate_phash(image_path),
            "clip_vector": generate_clip_embedding(image_path),
        }
    except FingerprintGenerationError:
        raise
    except Exception as e:
        logger.error("Unexpected fingerprint error for %s: %s", image_path, e, exc_info=True)
        raise FingerprintGenerationError(f"Fingerprint generation failed: {e}") from e
