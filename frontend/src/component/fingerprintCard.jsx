import { useState } from "react";

const statusMap = {
  original: {
    dot: "bg-emerald-400",
    label: "Original",
    ring: "shadow-emerald-400/40",
  },
  similar: {
    dot: "bg-amber-400",
    label: "Similar Found",
    ring: "shadow-amber-400/40",
  },
  risk: {
    dot: "bg-rose-500",
    label: "Risk Detected",
    ring: "shadow-rose-500/40",
  },
  pending: {
    dot: "bg-blue-400 animate-pulse",
    label: "Analyzing…",
    ring: "shadow-blue-400/40",
  },
  unknown: {
    dot: "bg-gray-400",
    label: "Unknown",
    ring: "shadow-gray-400/40",
  },
};

// Safe fallback if status is missing or unrecognized
const DEFAULT_STATUS = statusMap.unknown;


export function FingerprintCard({ fingerprint }) {
  const [copied, setCopied] = useState(false);
  const s = statusMap[fingerprint?.status] || DEFAULT_STATUS;

  function copy() {
    const idToCopy = fingerprint.fingerprintId || fingerprint.id || '';
    navigator.clipboard.writeText(idToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="glass relative overflow-hidden rounded-2xl p-6">
      <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[oklch(0.7_0.22_270)] opacity-20 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-[oklch(0.65_0.22_230)] opacity-20 blur-3xl" />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            TrueMark · Digital Certificate
          </span>
        </div>

        <div
          className={`flex items-center gap-2 rounded-full bg-black/30 px-3 py-1 text-xs shadow-md ${s.ring}`}
        >
          <span className={`h-2 w-2 rounded-full ${s.dot} animate-pulse`} />
          <span className="font-medium text-foreground">{s.label}</span>
        </div>
      </div>

      <div className="relative mt-6">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Fingerprint ID
        </div>

        <div className="mt-2 flex items-center gap-3">
          <code className="font-mono text-lg font-semibold tracking-wider text-gradient truncate max-w-xs">
            {fingerprint.fingerprintId || fingerprint.id || "—"}
          </code>

          <button
            onClick={copy}
            className="shrink-0 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-muted-foreground transition hover:border-[oklch(0.7_0.22_270)]/60 hover:text-foreground"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        {fingerprint.fileName && (
          <div className="mt-2 text-xs text-muted-foreground font-mono">
            File: {fingerprint.fileName}
          </div>
        )}
      </div>

      <div className="relative mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-4 text-xs">
        <div>
          <div className="uppercase tracking-widest text-muted-foreground">
            Created
          </div>

          <div className="mt-1 font-mono text-foreground">
            {new Date(fingerprint.createdAt).toLocaleString()}
          </div>
        </div>

        <div>
          <div className="uppercase tracking-widest text-muted-foreground">
            Issuer
          </div>

          <div className="mt-1 font-mono text-foreground">
            truemark.io
          </div>
        </div>
      </div>
    </div>
  );
}