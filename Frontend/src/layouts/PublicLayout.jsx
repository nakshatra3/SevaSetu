import { Link, Outlet } from "react-router-dom";
import Logo from "@/components/common/Logo";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_HOME } from "@/config/constants";

export default function PublicLayout() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="public">
      <header className="public__header">
        <Logo />
        <nav className="public__nav" aria-label="Account">
          {isAuthenticated ? (
            <Link className="btn btn--primary btn--sm" to={ROLE_HOME[user.role] || "/app"}>Open dashboard</Link>
          ) : (
            <>
              <Link className="btn btn--ghost btn--sm" to="/login">Log in</Link>
              <Link className="btn btn--primary btn--sm" to="/register">Create account</Link>
            </>
          )}
        </nav>
      </header>
      <main className="public__main">
        <Outlet />
      </main>
    </div>
  );
}
