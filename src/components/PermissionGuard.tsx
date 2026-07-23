import { useAuth } from '../context/AuthContext';
import { ReactNode } from 'react';

interface PermissionGuardProps {
  permission?: string;
  permissions?: string[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGuard({
  permission,
  permissions,
  fallback = null,
  children,
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission } = useAuth();

  if (permission) {
    if (!hasPermission(permission)) {
      return <>{fallback}</>;
    }
  }

  if (permissions && permissions.length > 0) {
    if (!hasAnyPermission(permissions)) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}
