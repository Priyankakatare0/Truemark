import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Navbar } from "../component/Navbar";
import { FingerprintCard } from "../component/FingerprintCard";
import { ScoreCard } from "../component/ScoreCard";
import { MatchList } from "../component/MatchList";

import { checkSimilarity, getFingerprint } from "../services/api";

export default function Dashboard() {
  const [image, setImage] = useState(null);
  const [fingerprint, setFingerprint] = useState(null);
  const [score, setScore] = useState(null);
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    const img = sessionStorage.getItem("tm:image");
    const id = sessionStorage.getItem("tm:fingerprintId") || "TM-DEMO-0000";

    if (img) setImage(img);

    getFingerprint(id).then(setFingerprint);

    checkSimilarity().then((r) => {
      setScore(r.score);
      setMatches(r.matches);
      sessionStorage.setItem("tm:score", String(r.score));
    });
  }, []);

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
              Your image has been fingerprinted and analyzed.
            </p>
          </div>

          <Link
            to="/report"
            className="btn-primary rounded-xl px-5 py-2.5 text-sm font-medium"
          >
            Download Report →
          </Link>
        </div>

        <div className="grid gap-6">
          {fingerprint ? (
            <FingerprintCard fingerprint={fingerprint} />
          ) : (
            <div className="glass h-40 animate-pulse rounded-2xl" />
          )}

          <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
            <div className="glass overflow-hidden rounded-2xl p-3">
              {image ? (
                <img
                  src={image}
                  alt="Uploaded"
                  className="h-full max-h-[420px] w-full rounded-xl object-contain"
                />
              ) : null}
            </div>

            {score !== null ? (
              <ScoreCard score={score} />
            ) : (
              <div className="glass h-72 w-72 animate-pulse rounded-2xl" />
            )}
          </div>

          {matches.length > 0 ? (
            <MatchList matches={matches} />
          ) : (
            <div className="glass h-48 animate-pulse rounded-2xl" />
          )}
        </div>
      </main>
    </div>
  );
}