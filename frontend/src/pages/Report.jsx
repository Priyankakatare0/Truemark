import { useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "../component/Navbar";
import { downloadReport } from "../services/api";

function readSession(key) {
  return sessionStorage.getItem(key);
}

function formatTimestamp(createdAt) {
  if (createdAt) return new Date(createdAt).toLocaleString();
  return new Date().toLocaleString();
}

export default function Report() {
  const [image] = useState(() => readSession("tm:image"));
  const [fingerprintId] = useState(() => readSession("tm:fingerprintId"));
  const [reportId] = useState(() => readSession("tm:reportId"));
  const [score] = useState(() => {
    const sc = readSession("tm:score");
    return sc ? parseFloat(sc) : null;
  });
  const [timestamp] = useState(() => formatTimestamp(readSession("tm:createdAt")));
  const [downloading, setDownloading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  async function handleDownload() {
    if (!reportId) {
      setError("No report ID found. Please analyze an image first by going to the Dashboard.");
      return;
    }

    setDownloading(true);
    setError(null);

    try {
      await downloadReport(reportId);
      setDone(true);
    } catch (err) {
      console.error("Download failed:", err);
      if (err.message.includes("PDF generation failed on server")) {
        setError(
          `The PDF could not be generated server-side. This may be because Supabase Storage is not configured. ` +
          `Your originality score is ${score ?? "—"}%. You can still use the fingerprint ID as proof.`
        );
      } else {
        setError(err.message);
      }
    } finally {
      setDownloading(false);
    }
  }

  const scoreLabel =
    score === null
      ? "—"
      : score >= 85
      ? "Highly Original"
      : score >= 65
      ? "Mostly Original"
      : "Low Originality";

  const scoreColor =
    score === null
      ? "text-muted-foreground"
      : score >= 85
      ? "text-emerald-400"
      : score >= 65
      ? "text-amber-400"
      : "text-rose-400";

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Proof Report
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            A signed snapshot of your ownership claim.
          </p>
        </div>

        <div className="glass overflow-hidden rounded-2xl">
          {image ? (
            <img
              src={image}
              alt="Uploaded"
              className="max-h-[360px] w-full object-contain bg-black/30"
            />
          ) : (
            <div className="flex h-40 items-center justify-center bg-black/20 text-sm text-muted-foreground">
              No image preview available
            </div>
          )}

          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <Field label="Fingerprint ID" value={fingerprintId || "—"} mono />
            <Field label="Timestamp" value={timestamp} mono />
            <Field
              label="Originality Score"
              value={
                score !== null ? (
                  <span className={scoreColor}>
                    {score}% — {scoreLabel}
                  </span>
                ) : (
                  "—"
                )
              }
              mono={false}
            />
            <Field label="Issuer" value="truemark.io" mono />
            {reportId && <Field label="Report ID" value={reportId} mono />}
          </div>
        </div>

        {!reportId && (
          <div className="mt-6 glass rounded-2xl p-5 border border-amber-500/30 bg-amber-500/10">
            <h3 className="text-sm font-semibold text-amber-400">No Report Available</h3>
            <p className="mt-1 text-sm text-amber-300/80">
              You need to analyze an image first. Go back to the Dashboard and wait for the analysis to complete.
            </p>
          </div>
        )}

        {error && (
          <div className="mt-6 glass rounded-2xl p-6 border border-red-500/30 bg-red-500/10">
            <h3 className="text-lg font-semibold text-red-400">Download Failed</h3>
            <p className="mt-2 text-sm text-red-300">{error}</p>
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            onClick={handleDownload}
            disabled={downloading || !reportId}
            className="btn-primary rounded-xl px-6 py-3 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {downloading
              ? "Preparing PDF…"
              : done
              ? "Re-download PDF"
              : "Download PDF"}
          </button>

          <Link
            to="/dashboard"
            className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-muted-foreground transition hover:text-foreground"
          >
            ← Back to dashboard
          </Link>

          {done ? (
            <span className="text-xs text-emerald-400">✓ Certificate downloaded</span>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function Field({ label, value, mono }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-1 text-sm text-foreground break-all ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
