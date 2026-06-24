import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const EyeIcon = ({ open }) =>
  open ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

function StrengthBar({ password }) {
  const score = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "#ef4444", "#f59e0b", "#3b82f6", "#22c55e"];
  return password ? (
    <div style={{ marginTop: "0.4rem" }}>
      <div style={{ display: "flex", gap: 4 }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 99,
            background: i <= score ? colors[score] : "rgba(255,255,255,0.08)",
            transition: "background 0.3s",
          }} />
        ))}
      </div>
      <p style={{ fontSize: "0.72rem", color: score > 0 ? colors[score] : "transparent", marginTop: 3 }}>
        {labels[score]}
      </p>
    </div>
  ) : null;
}

export default function Signup() {
  const { user, loading, signup } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Already logged in — redirect home
  if (!loading && user) return <Navigate to="/" replace />;

  function validate() {
    const errs = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email";
    if (password.length < 8) errs.password = "Password must be at least 8 characters";
    if (password !== confirm) errs.confirm = "Passwords do not match";
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await signup(name.trim(), email.trim(), password);
      navigate("/");
    } catch (err) {
      setError(err.message || "Signup failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = {
    width: "100%", padding: "0.75rem 1rem",
    borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.04)", color: "var(--foreground)",
    fontSize: "0.9rem", outline: "none", boxSizing: "border-box",
    transition: "border-color 0.2s",
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--background)" }}>
      {/* Ambient glow */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }} aria-hidden="true">
        <div style={{
          position: "absolute", top: "10%", right: "20%", width: 480, height: 480,
          borderRadius: "50%",
          background: "radial-gradient(circle, oklch(0.55 0.22 270 / 0.16) 0%, transparent 70%)",
          filter: "blur(60px)",
        }} />
        <div style={{
          position: "absolute", bottom: "15%", left: "10%", width: 360, height: 360,
          borderRadius: "50%",
          background: "radial-gradient(circle, oklch(0.55 0.22 200 / 0.14) 0%, transparent 70%)",
          filter: "blur(60px)",
        }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 440 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
            <div style={{
              height: 32, width: 32, borderRadius: 8,
              background: "linear-gradient(135deg, oklch(0.7 0.22 270), oklch(0.7 0.22 230))",
              boxShadow: "0 0 24px oklch(0.6 0.22 270 / 0.5)",
            }} />
            <span style={{ fontWeight: 700, fontSize: "1.25rem", color: "var(--foreground)", letterSpacing: "-0.02em" }}>
              True<span style={{ background: "linear-gradient(135deg, oklch(0.75 0.22 270), oklch(0.7 0.22 230))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Mark</span>
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="glass" style={{ borderRadius: 20, padding: "2.5rem", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ marginBottom: "1.75rem" }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
              Create your account
            </h1>
            <p style={{ marginTop: "0.4rem", fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
              Start protecting your creative work today
            </p>
          </div>

          {/* Global error */}
          {error && (
            <div style={{
              marginBottom: "1.25rem", padding: "0.875rem 1rem",
              borderRadius: 10, border: "1px solid rgba(239,68,68,0.4)",
              background: "rgba(239,68,68,0.1)", color: "#fca5a5",
              fontSize: "0.85rem", display: "flex", alignItems: "flex-start", gap: "0.5rem",
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            {/* Name */}
            <div>
              <label htmlFor="signup-name" style={{ display: "block", fontSize: "0.8rem", fontWeight: 500, color: "var(--muted-foreground)", marginBottom: "0.4rem", letterSpacing: "0.02em" }}>
                FULL NAME
              </label>
              <input
                id="signup-name"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => { setName(e.target.value); setFieldErrors((p) => ({ ...p, name: null })); }}
                placeholder="Your name"
                style={{ ...inputStyle, borderColor: fieldErrors.name ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)" }}
                onFocus={(e) => (e.target.style.borderColor = "oklch(0.7 0.22 270 / 0.6)")}
                onBlur={(e) => (e.target.style.borderColor = fieldErrors.name ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)")}
              />
              {fieldErrors.name && <p style={{ marginTop: "0.3rem", fontSize: "0.78rem", color: "#fca5a5" }}>{fieldErrors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="signup-email" style={{ display: "block", fontSize: "0.8rem", fontWeight: 500, color: "var(--muted-foreground)", marginBottom: "0.4rem", letterSpacing: "0.02em" }}>
                EMAIL ADDRESS
              </label>
              <input
                id="signup-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: null })); }}
                placeholder="you@example.com"
                style={{ ...inputStyle, borderColor: fieldErrors.email ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)" }}
                onFocus={(e) => (e.target.style.borderColor = "oklch(0.7 0.22 270 / 0.6)")}
                onBlur={(e) => (e.target.style.borderColor = fieldErrors.email ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)")}
              />
              {fieldErrors.email && <p style={{ marginTop: "0.3rem", fontSize: "0.78rem", color: "#fca5a5" }}>{fieldErrors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="signup-password" style={{ display: "block", fontSize: "0.8rem", fontWeight: 500, color: "var(--muted-foreground)", marginBottom: "0.4rem", letterSpacing: "0.02em" }}>
                PASSWORD
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: null })); }}
                  placeholder="Min. 8 characters"
                  style={{ ...inputStyle, padding: "0.75rem 3rem 0.75rem 1rem", borderColor: fieldErrors.password ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)" }}
                  onFocus={(e) => (e.target.style.borderColor = "oklch(0.7 0.22 270 / 0.6)")}
                  onBlur={(e) => (e.target.style.borderColor = fieldErrors.password ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)")}
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  style={{ position: "absolute", right: "0.85rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 4, lineHeight: 0 }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                ><EyeIcon open={showPassword} /></button>
              </div>
              {fieldErrors.password && <p style={{ marginTop: "0.3rem", fontSize: "0.78rem", color: "#fca5a5" }}>{fieldErrors.password}</p>}
              <StrengthBar password={password} />
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor="signup-confirm" style={{ display: "block", fontSize: "0.8rem", fontWeight: 500, color: "var(--muted-foreground)", marginBottom: "0.4rem", letterSpacing: "0.02em" }}>
                CONFIRM PASSWORD
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="signup-confirm"
                  type={showConfirm ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setFieldErrors((p) => ({ ...p, confirm: null })); }}
                  placeholder="Repeat password"
                  style={{ ...inputStyle, padding: "0.75rem 3rem 0.75rem 1rem", borderColor: fieldErrors.confirm ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)" }}
                  onFocus={(e) => (e.target.style.borderColor = "oklch(0.7 0.22 270 / 0.6)")}
                  onBlur={(e) => (e.target.style.borderColor = fieldErrors.confirm ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)")}
                />
                <button type="button" onClick={() => setShowConfirm((v) => !v)}
                  style={{ position: "absolute", right: "0.85rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 4, lineHeight: 0 }}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                ><EyeIcon open={showConfirm} /></button>
              </div>
              {fieldErrors.confirm && <p style={{ marginTop: "0.3rem", fontSize: "0.78rem", color: "#fca5a5" }}>{fieldErrors.confirm}</p>}
            </div>

            {/* Submit */}
            <button
              id="signup-submit"
              type="submit"
              disabled={submitting}
              style={{
                marginTop: "0.5rem", width: "100%", padding: "0.85rem",
                borderRadius: 10, border: "none", cursor: submitting ? "not-allowed" : "pointer",
                background: submitting
                  ? "rgba(255,255,255,0.08)"
                  : "linear-gradient(135deg, oklch(0.65 0.22 270), oklch(0.65 0.22 230))",
                color: "white", fontSize: "0.95rem", fontWeight: 600, letterSpacing: "0.01em",
                transition: "opacity 0.2s, transform 0.1s",
                boxShadow: submitting ? "none" : "0 0 20px oklch(0.6 0.22 270 / 0.35)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
              }}
              onMouseEnter={(e) => !submitting && (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseDown={(e) => !submitting && (e.currentTarget.style.transform = "scale(0.98)")}
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              {submitting ? (
                <>
                  <div style={{
                    width: 16, height: 16, borderRadius: "50%",
                    border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white",
                    animation: "spin 0.7s linear infinite",
                  }} />
                  Creating account…
                </>
              ) : "Create account"}
            </button>
          </form>

          <p style={{ marginTop: "1.75rem", textAlign: "center", fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "oklch(0.75 0.22 270)", fontWeight: 500, textDecoration: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
            >
              Sign in →
            </Link>
          </p>
        </div>

        <p style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.78rem", color: "var(--muted-foreground)", opacity: 0.6 }}>
          Proof of Creation · Protected by AI
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
