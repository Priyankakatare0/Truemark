import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Navbar } from "../component/Navbar";
import { FingerprintCard } from "../component/fingerprintCard";
import { ScoreCard } from "../component/ScoreCard";
import { MatchList } from "../component/MatchList";

import { checkSimilarity, getFingerprint } from "../services/api";

function computeStatus(score) {
  if (score >= 85) return "original";
  if (score >= 65) return "similar";
  return "risk";
}

function readSession(key) {
  return sessionStorage.getItem(key);
}

export default function Dashboard() {
  const [image] = useState(() => readSession("tm:image"));
  const [fingerprint, setFingerprint] = useState(null);
  const [score, setScore] = useState(null);
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState(() =>
    readSession("tm:fingerprintId") ? null : "No fingerprint ID found. Please upload an image first."
  );
  const [loading, setLoading] = useState(() => Boolean(readSession("tm:fingerprintId")));
  const [reportId, setReportId] = useState(null);

  useEffect(() => {
    const id = readSession("tm:fingerprintId");
    if (!id) return;

    let cancelled = false;

    async function loadDashboard() {
      try {
        const fp = await getFingerprint(id);
        const result = await checkSimilarity(id);
        if (cancelled) return;

        setFingerprint({ ...fp, status: computeStatus(result.score) });
        setScore(result.score);
        setMatches(result.matches);
        setReportId(result.reportId);

        sessionStorage.setItem("tm:score", String(result.score));
        if (result.reportId) {
          sessionStorage.setItem("tm:reportId", result.reportId);
        }
        if (fp.createdAt) {
          sessionStorage.setItem("tm:createdAt", fp.createdAt);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Dashboard load failed:", err);
        setError(err.message || "Failed to load analysis results.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  const reportReady = !loading && !error && reportId;

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Dashboard
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              {loading
                ? "Analyzing your image for similarity matches…"
                : "Your image has been fingerprinted and analyzed."}
            </p>
          </div>

          {reportReady ? (
            <Link
              to="/report"
              className="btn-primary rounded-xl px-5 py-2.5 text-sm font-medium"
            >
              Download Report →
            </Link>
          ) : (
            <span className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-muted-foreground opacity-60">
              Report pending…
            </span>
          )}
        </div>

        <div className="grid gap-6">
          {error && (
            <div className="glass rounded-2xl p-6 border border-red-500/30 bg-red-500/10">
              <h3 className="text-lg font-semibold text-red-400">Analysis Failed</h3>
              <p className="mt-2 text-sm text-red-300">{error}</p>
              <Link to="/" className="mt-4 inline-block text-sm text-red-200 underline">
                ← Upload a new image
              </Link>
            </div>
          )}

          {loading ? (
            <div className="glass h-40 animate-pulse rounded-2xl" />
          ) : fingerprint ? (
            <FingerprintCard fingerprint={fingerprint} />
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
            <div className="glass overflow-hidden rounded-2xl p-3">
              {image ? (
                <img
                  src={image}
                  alt="Uploaded"
                  className="h-full max-h-[420px] w-full rounded-xl object-contain"
                />
              ) : (
                <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                  No image preview available
                </div>
              )}
            </div>

            {loading ? (
              <div className="glass flex h-72 w-72 flex-col items-center justify-center gap-3 animate-pulse rounded-2xl">
                <div className="h-10 w-10 rounded-full border-4 border-[oklch(0.7_0.22_270)] border-t-transparent animate-spin" />
                <span className="text-xs text-muted-foreground">Analyzing…</span>
              </div>
            ) : score !== null ? (
              <ScoreCard score={score} />
            ) : null}
          </div>

          {loading ? (
            <div className="glass h-48 animate-pulse rounded-2xl" />
          ) : matches.length > 0 ? (
            <MatchList matches={matches} />
          ) : !error ? (
            <div className="glass rounded-2xl p-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6 text-emerald-400">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="font-semibold text-foreground">No Similar Images Found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Your image appears to be original — no significant matches were detected.
              </p>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
