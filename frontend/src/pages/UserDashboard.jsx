// frontend/src/pages/UserDashboard.jsx
// Full User Dashboard — shows profile stats, fingerprint history, and report history

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Navbar } from "../component/Navbar";
import { NotionSettingsModal } from "../component/NotionSettingsModal";
import { getUserFingerprints, getUserReports, getUserStats, downloadReport, thumbnailUrl, exportToNotion } from "../services/api";

/* ─── Helper Utilities ──────────────────────────────────────── */
function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function scoreColor(score) {
  if (score === null || score === undefined) return "#6b7280";
  if (score >= 85) return "#34d399";
  if (score >= 65) return "#fbbf24";
  return "#f87171";
}

function scoreLabel(score) {
  if (score === null || score === undefined) return "N/A";
  if (score >= 85) return "Highly Original";
  if (score >= 65) return "Mostly Original";
  return "Low Originality";
}

function Avatar({ name, size = 40 }) {
  const initials = name
    ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "U";
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "linear-gradient(135deg, oklch(0.65 0.22 270), oklch(0.65 0.22 230))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        color: "white",
        fontSize: size * 0.36,
        flexShrink: 0,
        boxShadow: "0 0 20px oklch(0.6 0.22 270 / 0.4)",
      }}
    >
      {initials}
    </div>
  );
}

/* ─── Stat Card ─────────────────────────────────────────────── */
function StatCard({ icon, label, value, sub, gradient }) {
  return (
    <div
      className="glass rounded-2xl p-5 relative overflow-hidden"
      style={{ border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div
        style={{
          position: "absolute",
          top: -30,
          right: -30,
          width: 100,
          height: 100,
          borderRadius: "50%",
          background: gradient || "oklch(0.7 0.22 270 / 0.12)",
          filter: "blur(20px)",
        }}
      />
      <div className="relative">
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: gradient || "linear-gradient(135deg, oklch(0.6 0.22 270), oklch(0.6 0.22 230))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "0.75rem",
          }}
        >
          {icon}
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.25rem" }}>
          {label}
        </div>
        <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--foreground)", lineHeight: 1 }}>
          {value}
        </div>
        {sub && (
          <div style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Tab Button ─────────────────────────────────────────────── */
function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "0.5rem 1.25rem",
        borderRadius: 999,
        border: active ? "1px solid oklch(0.7 0.22 270 / 0.5)" : "1px solid rgba(255,255,255,0.07)",
        background: active ? "oklch(0.7 0.22 270 / 0.15)" : "transparent",
        color: active ? "oklch(0.85 0.15 270)" : "var(--muted-foreground)",
        fontWeight: 500,
        fontSize: "0.85rem",
        cursor: "pointer",
        transition: "all 0.2s",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

/* ─── Fingerprint Row ────────────────────────────────────────── */
function FingerprintRow({ fp }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(fp.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "48px 1fr auto auto",
        alignItems: "center",
        gap: "1rem",
        padding: "0.875rem 1rem",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(255,255,255,0.02)",
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
    >
      {/* Thumbnail */}
      <img
        src={thumbnailUrl(fp.id)}
        alt={fp.file_name}
        style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", background: "rgba(255,255,255,0.05)" }}
        onError={(e) => {
          e.target.style.display = "none";
          e.target.nextSibling.style.display = "flex";
        }}
      />
      <div
        style={{
          width: 48, height: 48, borderRadius: 8,
          background: "rgba(255,255,255,0.05)",
          display: "none",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--muted-foreground)",
          fontSize: "0.6rem",
          textAlign: "center",
          flexShrink: 0,
        }}
      >
        IMG
      </div>

      {/* Info */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {fp.file_name}
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
          {fp.id}
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", marginTop: 1 }}>
          {formatDateTime(fp.created_at)}
        </div>
      </div>

      {/* Owner label */}
      {fp.owner_label && (
        <span style={{ fontSize: "0.72rem", color: "oklch(0.75 0.15 270)", border: "1px solid oklch(0.7 0.22 270 / 0.3)", borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" }}>
          {fp.owner_label}
        </span>
      )}

      {/* Copy */}
      <button
        onClick={copy}
        style={{
          padding: "4px 10px",
          borderRadius: 6,
          border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.04)",
          color: "var(--muted-foreground)",
          fontSize: "0.72rem",
          cursor: "pointer",
          transition: "all 0.2s",
          whiteSpace: "nowrap",
        }}
      >
        {copied ? "✓ Copied" : "Copy ID"}
      </button>
    </div>
  );
}

/* ─── Report Row ─────────────────────────────────────────────── */
function ReportRow({ report, onDownload, downloading, onExport, exporting }) {
  const score = report.originality_score;
  const color = scoreColor(score);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto auto",
        alignItems: "center",
        gap: "1rem",
        padding: "0.875rem 1rem",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(255,255,255,0.02)",
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
    >
      {/* Info */}
      <div>
        <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--foreground)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {report.id}
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", marginTop: 2 }}>
          {formatDateTime(report.created_at)}
        </div>
      </div>

      {/* Score badge */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
        <span style={{ fontSize: "1rem", fontWeight: 700, color }}>
          {score !== null && score !== undefined ? `${Math.round(score)}%` : "—"}
        </span>
        <span style={{ fontSize: "0.65rem", color, opacity: 0.8 }}>{scoreLabel(score)}</span>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          onClick={() => onExport(report.id, report.fingerprint_id)}
          disabled={exporting === report.id}
          style={{
            padding: "6px 14px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.04)",
            color: "var(--foreground)",
            fontSize: "0.75rem",
            fontWeight: 500,
            cursor: exporting === report.id ? "wait" : "pointer",
            opacity: exporting === report.id ? 0.6 : 1,
            transition: "all 0.2s",
            whiteSpace: "nowrap",
          }}
          title="Export to Notion"
        >
          {exporting === report.id ? "…" : "↗ Notion"}
        </button>

        <button
          onClick={() => onDownload(report.id)}
          disabled={downloading === report.id}
          style={{
            padding: "6px 14px",
            borderRadius: 8,
            border: "none",
            background: "linear-gradient(135deg, oklch(0.65 0.22 270), oklch(0.65 0.22 230))",
            color: "white",
            fontSize: "0.75rem",
            fontWeight: 600,
            cursor: downloading === report.id ? "wait" : "pointer",
            opacity: downloading === report.id ? 0.6 : 1,
            transition: "all 0.2s",
            whiteSpace: "nowrap",
          }}
        >
          {downloading === report.id ? "…" : "↓ PDF"}
        </button>
      </div>
    </div>
  );
}

/* ─── Empty State ────────────────────────────────────────────── */
function EmptyState({ message, cta }) {
  return (
    <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", margin: "0 auto 1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ width: 24, height: 24, color: "var(--muted-foreground)" }}>
          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem" }}>{message}</p>
      {cta && (
        <Link to="/" style={{ display: "inline-block", marginTop: "1rem", padding: "0.5rem 1.25rem", borderRadius: 8, background: "linear-gradient(135deg, oklch(0.65 0.22 270), oklch(0.65 0.22 230))", color: "white", fontWeight: 600, fontSize: "0.85rem", textDecoration: "none" }}>
          {cta}
        </Link>
      )}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */
export default function UserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [fingerprints, setFingerprints] = useState([]);
  const [reports, setReports] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingFps, setLoadingFps] = useState(false);
  const [loadingRpts, setLoadingRpts] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [exporting, setExporting] = useState(null);
  const [error, setError] = useState(null);
  const [isNotionModalOpen, setIsNotionModalOpen] = useState(false);

  // Load stats on mount
  useEffect(() => {
    let cancelled = false;
    setLoadingStats(true);
    getUserStats()
      .then((s) => { if (!cancelled) setStats(s); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoadingStats(false); });
    return () => { cancelled = true; };
  }, []);

  // Load fingerprints when Uploads tab selected
  useEffect(() => {
    if (tab !== "uploads") return;
    let cancelled = false;
    setLoadingFps(true);
    getUserFingerprints(20, 0)
      .then((d) => { if (!cancelled) setFingerprints(d.items || []); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoadingFps(false); });
    return () => { cancelled = true; };
  }, [tab]);

  // Load reports when Reports tab selected
  useEffect(() => {
    if (tab !== "reports") return;
    let cancelled = false;
    setLoadingRpts(true);
    getUserReports(20, 0)
      .then((d) => { if (!cancelled) setReports(d.items || []); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoadingRpts(false); });
    return () => { cancelled = true; };
  }, [tab]);

  async function handleDownload(reportId) {
    setDownloading(reportId);
    try {
      await downloadReport(reportId);
    } catch (e) {
      setError(e.message);
    } finally {
      setDownloading(null);
    }
  }

  async function handleExportToNotion(reportId, fingerprintId) {
    const apiKey = localStorage.getItem("tm:notion_api_key");
    const dbId = localStorage.getItem("tm:notion_database_id");
    
    if (!apiKey || !dbId) {
      setIsNotionModalOpen(true);
      return;
    }

    setExporting(reportId);
    try {
      const isDuplicate = false; // from history, we assume original unless flagged otherwise, backend will fetch report
      const res = await exportToNotion(apiKey, dbId, reportId, fingerprintId, isDuplicate);
      if (res.success) {
        // Show temporary success state or open notion URL
        window.open(res.notion_url, "_blank");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setExporting(null);
    }
  }

  const memberSince = stats?.member_since
    ? new Date(stats.member_since).toLocaleDateString("en-US", { year: "numeric", month: "long" })
    : "—";

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      <Navbar />

      {/* Ambient glow */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }} aria-hidden="true">
        <div style={{ position: "absolute", top: "10%", right: "15%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, oklch(0.55 0.22 270 / 0.12) 0%, transparent 70%)", filter: "blur(70px)" }} />
        <div style={{ position: "absolute", bottom: "10%", left: "5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, oklch(0.55 0.22 230 / 0.1) 0%, transparent 70%)", filter: "blur(70px)" }} />
      </div>

      <main style={{ position: "relative", zIndex: 1, maxWidth: 1000, margin: "0 auto", padding: "2.5rem 1.5rem 4rem" }}>

        {/* ── Profile Header ── */}
        <div className="glass rounded-2xl" style={{ padding: "2rem", marginBottom: "1.5rem", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
            <Avatar name={user?.name} size={64} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--foreground)", margin: 0 }}>
                {user?.name || "Your Dashboard"}
              </h1>
              <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", marginTop: "0.15rem" }}>
                {user?.email}
              </p>
              <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginTop: "0.25rem", opacity: 0.7 }}>
                Member since {memberSince}
              </p>
            </div>
            <Link
              to="/"
              style={{
                padding: "0.6rem 1.25rem",
                borderRadius: 10,
                background: "linear-gradient(135deg, oklch(0.65 0.22 270), oklch(0.65 0.22 230))",
                color: "white",
                fontWeight: 600,
                fontSize: "0.85rem",
                textDecoration: "none",
                boxShadow: "0 0 20px oklch(0.6 0.22 270 / 0.3)",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 16, height: 16 }}>
                <path d="M12 4v12m0-12l-4 4m4-4l4 4M4 20h16" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              New Upload
            </Link>
          </div>
        </div>

        {/* ── Stats Row ── */}
        {loadingStats ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            {[0,1,2,3].map((i) => (
              <div key={i} className="glass rounded-2xl" style={{ height: 110, animation: "pulse 1.5s ease-in-out infinite", opacity: 0.5 }} />
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            <StatCard
              label="Total Uploads"
              value={stats?.total_uploads ?? 0}
              sub="fingerprinted images"
              gradient="linear-gradient(135deg, oklch(0.6 0.22 270 / 0.3), oklch(0.6 0.22 230 / 0.3))"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} style={{ width: 18, height: 18 }}>
                  <path d="M12 4v12m0-12l-4 4m4-4l4 4M4 20h16" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            />
            <StatCard
              label="Reports Generated"
              value={stats?.total_reports ?? 0}
              sub="PDF certificates"
              gradient="linear-gradient(135deg, oklch(0.65 0.2 200 / 0.3), oklch(0.65 0.2 160 / 0.3))"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} style={{ width: 18, height: 18 }}>
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            />
            <StatCard
              label="Avg. Originality"
              value={stats?.avg_originality_score != null ? `${stats.avg_originality_score}%` : "—"}
              sub={stats?.avg_originality_score != null ? scoreLabel(stats.avg_originality_score) : "no reports yet"}
              gradient="linear-gradient(135deg, oklch(0.7 0.2 140 / 0.3), oklch(0.65 0.2 120 / 0.3))"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} style={{ width: 18, height: 18 }}>
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            />
            <StatCard
              label="Account Status"
              value="Active"
              sub="Verified creator"
              gradient="linear-gradient(135deg, oklch(0.65 0.2 40 / 0.3), oklch(0.65 0.2 20 / 0.3))"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} style={{ width: 18, height: 18 }}>
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            />
          </div>
        )}

        {/* ── Error Banner ── */}
        {error && (
          <div style={{ marginBottom: "1rem", padding: "0.875rem 1rem", borderRadius: 10, border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.08)", color: "#fca5a5", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 16, height: 16, flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
            <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: "1rem" }}>✕</button>
          </div>
        )}

        {/* ── Tabs ── */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
          <TabBtn active={tab === "overview"} onClick={() => setTab("overview")}>Overview</TabBtn>
          <TabBtn active={tab === "uploads"} onClick={() => setTab("uploads")}>
            My Uploads {stats?.total_uploads > 0 && `(${stats.total_uploads})`}
          </TabBtn>
          <TabBtn active={tab === "reports"} onClick={() => setTab("reports")}>
            My Reports {stats?.total_reports > 0 && `(${stats.total_reports})`}
          </TabBtn>
        </div>

        {/* ── Tab Content ── */}
        <div className="glass rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>

          {/* OVERVIEW TAB */}
          {tab === "overview" && (
            <div style={{ padding: "1.75rem" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.25rem" }}>
                How TrueMark Protects Your Work
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
                {[
                  {
                    step: "01",
                    title: "Upload & Fingerprint",
                    desc: "Your image is analyzed by a CLIP AI model and a perceptual hash is generated — a tamper-proof DNA of your work.",
                    color: "oklch(0.7 0.22 270)",
                  },
                  {
                    step: "02",
                    title: "Similarity Analysis",
                    desc: "Your fingerprint is compared against thousands of registered works using vector similarity search.",
                    color: "oklch(0.7 0.22 230)",
                  },
                  {
                    step: "03",
                    title: "Originality Score",
                    desc: "You get a score from 0–100. Highly original work scores 85+. Lower scores mean similar work exists.",
                    color: "oklch(0.7 0.2 200)",
                  },
                  {
                    step: "04",
                    title: "PDF Proof Certificate",
                    desc: "Download a signed PDF proof of your ownership claim — usable in DMCA disputes, platforms, or court.",
                    color: "oklch(0.7 0.2 160)",
                  },
                ].map((item) => (
                  <div key={item.step} style={{ padding: "1.25rem", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                    <div style={{ fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.15em", color: item.color, marginBottom: "0.5rem" }}>
                      STEP {item.step}
                    </div>
                    <div style={{ fontWeight: 600, color: "var(--foreground)", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--muted-foreground)", lineHeight: 1.5 }}>
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick actions */}
              <div style={{ marginTop: "1.75rem", padding: "1.25rem", borderRadius: 12, border: "1px solid oklch(0.7 0.22 270 / 0.2)", background: "oklch(0.7 0.22 270 / 0.05)" }}>
                <div style={{ fontWeight: 600, marginBottom: "0.75rem", fontSize: "0.9rem", color: "var(--foreground)" }}>
                  Quick Actions
                </div>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  <Link to="/" style={{ padding: "0.5rem 1rem", borderRadius: 8, background: "linear-gradient(135deg, oklch(0.65 0.22 270), oklch(0.65 0.22 230))", color: "white", fontWeight: 600, fontSize: "0.8rem", textDecoration: "none", transition: "opacity 0.2s" }}>
                    + Upload New Image
                  </Link>
                  <button onClick={() => setTab("uploads")} style={{ padding: "0.5rem 1rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "var(--muted-foreground)", fontWeight: 500, fontSize: "0.8rem", cursor: "pointer", transition: "all 0.2s" }}>
                    View My Uploads →
                  </button>
                  <button onClick={() => setTab("reports")} style={{ padding: "0.5rem 1rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "var(--muted-foreground)", fontWeight: 500, fontSize: "0.8rem", cursor: "pointer", transition: "all 0.2s" }}>
                    View My Reports →
                  </button>
                  <button onClick={() => setIsNotionModalOpen(true)} style={{ padding: "0.5rem 1rem", borderRadius: 8, border: "1px solid oklch(0.7 0.22 270 / 0.5)", background: "oklch(0.7 0.22 270 / 0.1)", color: "oklch(0.8 0.22 270)", fontWeight: 500, fontSize: "0.8rem", cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14 }}>
                      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Connect Notion
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* UPLOADS TAB */}
          {tab === "uploads" && (
            <div style={{ padding: "1.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>My Fingerprinted Uploads</h2>
                <Link to="/" style={{ fontSize: "0.8rem", color: "oklch(0.75 0.15 270)", textDecoration: "none", fontWeight: 500 }}>
                  + Upload new
                </Link>
              </div>
              {loadingFps ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {[0,1,2,3].map((i) => (
                    <div key={i} style={{ height: 70, borderRadius: 12, background: "rgba(255,255,255,0.03)", animation: "pulse 1.5s ease-in-out infinite" }} />
                  ))}
                </div>
              ) : fingerprints.length === 0 ? (
                <EmptyState message="You haven't uploaded any images yet." cta="Upload your first image →" />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  {fingerprints.map((fp) => <FingerprintRow key={fp.id} fp={fp} />)}
                </div>
              )}
            </div>
          )}

          {/* REPORTS TAB */}
          {tab === "reports" && (
            <div style={{ padding: "1.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>My Proof Reports</h2>
                <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                  {reports.length} report{reports.length !== 1 ? "s" : ""}
                </span>
              </div>
              {loadingRpts ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {[0,1,2,3].map((i) => (
                    <div key={i} style={{ height: 70, borderRadius: 12, background: "rgba(255,255,255,0.03)", animation: "pulse 1.5s ease-in-out infinite" }} />
                  ))}
                </div>
              ) : reports.length === 0 ? (
                <EmptyState message="No reports yet. Upload an image and run analysis to generate your first proof." cta="Upload & Analyze →" />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  {reports.map((r) => (
                    <ReportRow
                      key={r.id}
                      report={r}
                      onDownload={handleDownload}
                      downloading={downloading}
                      onExport={handleExportToNotion}
                      exporting={exporting}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* ── Footer note ── */}
        <p style={{ textAlign: "center", marginTop: "2rem", fontSize: "0.75rem", color: "var(--muted-foreground)", opacity: 0.5 }}>
          All data is securely stored in Supabase · TrueMark v1.0
        </p>
      </main>

      <NotionSettingsModal isOpen={isNotionModalOpen} onClose={() => setIsNotionModalOpen(false)} />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
