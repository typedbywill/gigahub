import React from 'react';
import { Navigate } from 'react-router-dom';
import { routes } from '../routes';
import { useAuthStore } from '../stores/auth.store';

interface RequirePermissionProps {
  permission: string | string[];
  children: React.ReactNode;
  fallbackTo?: string;
}

export const RequirePermission: React.FC<RequirePermissionProps> = ({
  permission,
  children,
  fallbackTo = routes.home,
}) => {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const hasAnyPermission = useAuthStore((s) => s.hasAnyPermission);
  const allowed = Array.isArray(permission)
    ? hasAnyPermission(...permission)
    : hasPermission(permission);

  if (!allowed) {
    return <Navigate to={fallbackTo} replace />;
  }

  return <>{children}</>;
};
