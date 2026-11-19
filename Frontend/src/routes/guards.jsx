import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_HOME } from "@/config/constants";

// Only logged-in users. Pass roles={[...]} to limit by role.
export function ProtectedRoute({ roles }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }
  return <Outlet />;
}

// Only logged-out users (login/register). Logged-in users are sent onward.
export function GuestRoute() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (isAuthenticated) {
    return <Navigate to={location.state?.from || ROLE_HOME[user.role] || "/app"} replace />;
  }
  return <Outlet />;
}

export function RoleHomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={ROLE_HOME[user.role] || "/"} replace />;
}
