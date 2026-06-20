import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "../component/Navbar";

export default function Report() {
  const [image, setImage] = useState(null);
  const [fingerprintId, setFingerprintId] = useState("TM-DEMO-0000");
  const [score, setScore] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [done, setDone] = useState(false);
  const [timestamp, setTimestamp] = useState("—");

  useEffect(() => {
    setTimestamp(new Date().toLocaleString());

    const img = sessionStorage.getItem("tm:image");
    const id = sessionStorage.getItem("tm:fingerprintId");
    const sc = sessionStorage.getItem("tm:score");

    if (img) setImage(img);
    if (id) setFingerprintId(id);
    if (sc) setScore(sc);
  }, []);

  function fakeDownload() {
    setDownloading(true);

    setTimeout(() => {
      setDownloading(false);
      setDone(true);
    }, 1400);
  }

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
          ) : null}

          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <Field
              label="Fingerprint ID"
              value={fingerprintId}
              mono
            />

            <Field
              label="Timestamp"
              value={timestamp}
              mono
            />

            <Field
              label="Originality Score"
              value={score ? `${score} / 100` : "—"}
              mono
            />

            <Field
              label="Issuer"
              value="truemark.io"
              mono
            />
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            onClick={fakeDownload}
            disabled={downloading}
            className="btn-primary rounded-xl px-6 py-3 text-sm font-semibold disabled:opacity-60"
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
            <span className="text-xs text-emerald-400">
              ✓ Certificate generated
            </span>
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
        className={`mt-1 text-sm text-foreground ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}