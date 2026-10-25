import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function ProtectedRoute({
  children,
  allowedRoles,
}) {
  const {
    user,
    userProfile,
    loading,
  } = useAuth();

  if (loading) {
    return <p>Carregando...</p>;
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (!userProfile) {
    return (
      <div>
        <p>Carregando perfil...</p>
      </div>
    );
  }

  if (
    allowedRoles &&
    !allowedRoles.includes(userProfile.role)
  ) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  return children;
}

export default ProtectedRoute;