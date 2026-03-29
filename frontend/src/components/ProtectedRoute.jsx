import { Navigate, useLocation } from "react-router-dom";

function ProtectedRoute({ children, allowedRoles }) {
  const location = useLocation();

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch {
    user = null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const role = String(user.role || "").toLowerCase();
  const allowed = allowedRoles.map((r) => String(r).toLowerCase());

  if (!allowed.includes(role)) {
    return <Navigate to="/" replace />;
  }

  if (user.mustChangePassword && location.pathname !== "/force-change-password") {
    return <Navigate to="/force-change-password" replace />;
  }

  return children;
}

export default ProtectedRoute;