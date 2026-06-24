import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const isActive = (path) => location.pathname === path;

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <header className="sticky top-0 z-50 w-full" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "oklch(0.09 0.02 270 / 0.85)", backdropFilter: "blur(20px)" }}>
      <nav style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.875rem 1.5rem" }}>

        {/* Logo */}
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
          <div style={{
            height: 28, width: 28, borderRadius: 7,
            background: "linear-gradient(135deg, oklch(0.7 0.22 270), oklch(0.7 0.22 230))",
            boxShadow: "0 0 16px oklch(0.6 0.22 270 / 0.5)",
            flexShrink: 0,
          }} />
          <span style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--foreground)", letterSpacing: "-0.02em" }}>
            True<span style={{ background: "linear-gradient(135deg, oklch(0.8 0.22 270), oklch(0.75 0.22 230))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Mark</span>
          </span>
        </Link>

        {/* Nav Links */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.875rem" }}>
          <NavLink to="/" active={isActive("/")}>Home</NavLink>

          {user && (
            <>
              <NavLink to="/user-dashboard" active={isActive("/user-dashboard")}>My Dashboard</NavLink>
              <NavLink to="/dashboard" active={isActive("/dashboard")}>Analysis</NavLink>
              <NavLink to="/report" active={isActive("/report")}>Report</NavLink>
            </>
          )}
        </div>

        {/* Auth section */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {user ? (
            <>
              {/* User avatar + name */}
              <Link
                to="/user-dashboard"
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}
                title="Go to your dashboard"
              >
                <div
                  style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: "linear-gradient(135deg, oklch(0.65 0.22 270), oklch(0.65 0.22 230))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.75rem", fontWeight: 700, color: "white", flexShrink: 0,
                    boxShadow: "0 0 12px oklch(0.6 0.22 270 / 0.4)",
                    transition: "box-shadow 0.2s",
                  }}
                  title={user.email}
                >
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <span style={{ fontSize: "0.85rem", color: "var(--foreground)", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  className="hidden sm:block"
                >
                  {user.name}
                </span>
              </Link>

              {/* Reports badge */}
              {user.reports > 0 && (
                <span
                  style={{ fontSize: "0.7rem", color: "var(--muted-foreground)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 999, padding: "2px 8px", display: "flex", alignItems: "center", gap: 4 }}
                  title="Reports generated"
                  className="hidden sm:flex"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 12, height: 12 }}>
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {user.reports}
                </span>
              )}

              {/* Logout */}
              <button
                id="navbar-logout"
                onClick={handleLogout}
                style={{
                  padding: "0.375rem 0.875rem",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--muted-foreground)",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--foreground)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                style={{ padding: "0.375rem 0.875rem", borderRadius: 8, color: "var(--muted-foreground)", fontSize: "0.85rem", textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                style={{
                  padding: "0.4rem 1rem",
                  borderRadius: 8,
                  background: "linear-gradient(135deg, oklch(0.65 0.22 270), oklch(0.65 0.22 230))",
                  color: "white",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  boxShadow: "0 0 14px oklch(0.6 0.22 270 / 0.3)",
                  transition: "opacity 0.2s",
                }}
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

function NavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      style={{
        padding: "0.35rem 0.75rem",
        borderRadius: 8,
        color: active ? "var(--foreground)" : "var(--muted-foreground)",
        fontWeight: active ? 500 : 400,
        textDecoration: "none",
        fontSize: "0.875rem",
        transition: "color 0.2s",
        background: active ? "rgba(255,255,255,0.05)" : "transparent",
      }}
    >
      {children}
    </Link>
  );
}