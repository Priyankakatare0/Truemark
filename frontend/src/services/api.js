// Mock API for TrueMark - simulates fingerprinting + similarity checks.

function delay(value, ms = 900) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function randomHex(len) {
  const chars = "0123456789ABCDEF";
  let out = "";

  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * 16)];
  }

  return out;
}

export function uploadImage(_file) {
  const fingerprintId = `TM-${randomHex(4)}-${randomHex(4)}`;
  return delay({ fingerprintId }, 1200);
}

export function checkSimilarity() {
  const score = Math.floor(Math.random() * 50) + 50; // 50–99

  const matches = Array.from({ length: 4 }).map((_, i) => ({
    id: `match-${i}`,
    source: ["pinterest.com", "behance.net", "dribbble.com", "unsplash.com"][i],
    similarity: Math.max(
      20,
      score - i * 12 - Math.floor(Math.random() * 8)
    ),
    thumbnail: `https://picsum.photos/seed/tm${i}${score}/200/200`,
  }));

  return delay({ score, matches }, 1000);
}

export function getFingerprint(fingerprintId) {
  const seed = fingerprintId.charCodeAt(3) % 3;

  const status =
    seed === 0 ? "original" : seed === 1 ? "similar" : "risk";

  return delay(
    {
      fingerprintId,
      createdAt: new Date().toISOString(),
      status,
    },
    500
  );
}