import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "../component/Navbar";
import { UploadZone } from "../component/UploadZone";
import { uploadImage } from "../services/api";

const Home = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleFile(file, dataUrl) {
    try {
      setLoading(true);
      setError(null);

      const { fingerprintId } = await uploadImage(file);

      sessionStorage.setItem("tm:image", dataUrl);
      sessionStorage.setItem("tm:fingerprintId", fingerprintId);

      navigate("/dashboard");
    } catch (err) {
      console.error("Upload failed:", err);
      setError(err.message || "Failed to upload image. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 pb-24">
        <section className="pt-24 pb-16 text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.7_0.22_270)] animate-pulse" />
            Proof of authorship for the AI era
          </div>

          <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
            <span className="text-gradient">TrueMark</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Fingerprint your work, detect lookalikes, and issue tamper-proof
            certificates of digital ownership — in seconds.
          </p>
        </section>

        <section className="mx-auto max-w-3xl">
          {error && (
            <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/50 p-4 text-red-400 text-center">
              {error}
            </div>
          )}
          <UploadZone onFile={handleFile} loading={loading} />
        </section>

        <section className="mt-24 grid gap-6 sm:grid-cols-3">
          {[
            {
              title: "Fingerprinting",
              desc: "Generate a unique perceptual hash for every upload — your work's DNA.",
              icon:
                "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
            },
            {
              title: "Detection",
              desc: "Scan the web for visual duplicates and similar imagery in real-time.",
              icon:
                "M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z",
            },
            {
              title: "Reports",
              desc: "Download signed PDF proof you can share with platforms or in court.",
              icon:
                "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="glass rounded-2xl p-6 transition hover:-translate-y-1"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[oklch(0.6_0.22_270)] to-[oklch(0.6_0.22_230)]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-5 w-5 text-white"
                >
                  <path
                    d={f.icon}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <h3 className="font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};

export default Home;