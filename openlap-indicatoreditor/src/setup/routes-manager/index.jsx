import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../auth-context-manager/auth-context-manager.jsx";

const PrivateRoute = ({ component: Component, allowedRoles }) => {
  const { user } = useContext(AuthContext);

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!user.roles.some((role) => allowedRoles.includes(role))) {
    return <Navigate to="/login" />;
  }

  return Component;
};

export default PrivateRoute;
