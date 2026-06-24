// frontend/src/component/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Wraps a route so it redirects to /login if the user is not authenticated.
 * Shows a centered spinner while the auth state is being hydrated from the cookie.
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-[oklch(0.7_0.22_270)] border-t-transparent animate-spin" />
          <span className="text-sm text-muted-foreground">Authenticating…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
