import React from "react";
import { useAuth } from "../../auth/AuthContext";
import { UserRole } from "../../auth/authTypes";

interface PermissionGuardProps {
  permission?: string;
  permissions?: string[];
  role?: UserRole | string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  permissions,
  role,
  fallback = null,
  children,
}) => {
  const { hasPermission, hasAnyPermission, hasRole } = useAuth();

  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  if (permissions && permissions.length > 0 && !hasAnyPermission(permissions)) {
    return <>{fallback}</>;
  }

  if (role && !hasRole(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
