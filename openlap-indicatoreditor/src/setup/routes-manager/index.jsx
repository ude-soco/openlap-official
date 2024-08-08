import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../app-context-manager/app-context-manager";

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
