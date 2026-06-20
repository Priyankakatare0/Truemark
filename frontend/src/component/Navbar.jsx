import { Link, useLocation } from "react-router-dom";

export function Navbar() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/40 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-gradient-to-br from-[oklch(0.7_0.22_270)] to-[oklch(0.7_0.22_230)] shadow-lg shadow-[oklch(0.6_0.22_270)]/40" />
          <span className="font-semibold tracking-tight text-foreground">
            True<span className="text-gradient">Mark</span>
          </span>
        </Link>

        {/* Nav Links */}
        <div className="flex items-center gap-1 text-sm">

          <Link
            to="/"
            className={`rounded-md px-3 py-1.5 transition ${
              isActive("/")
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Home
          </Link>

          <Link
            to="/dashboard"
            className={`rounded-md px-3 py-1.5 transition ${
              isActive("/dashboard")
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Dashboard
          </Link>

          <Link
            to="/report"
            className={`rounded-md px-3 py-1.5 transition ${
              isActive("/report")
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Report
          </Link>

        </div>
      </nav>
    </header>
  );
}