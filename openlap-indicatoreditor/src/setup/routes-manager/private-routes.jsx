import { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "../auth-context-manager/auth-context-manager.jsx";

const PrivateRoute = ({ component: Component, allowedRoles }) => {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  const userRoles = Array.isArray(user?.roles)
    ? user.roles
    : user?.roles
      ? [user.roles]
      : [];

  const isAllowed = userRoles.some((role) => allowedRoles.includes(role));

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!isAllowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return Component;
};

export default PrivateRoute;
