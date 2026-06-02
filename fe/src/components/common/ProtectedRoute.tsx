import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../context/AuthContext';
import { canAccess } from '../../utils/rbac';
import { getDefaultRouteForRole } from '../../utils/authRedirect';

export function ProtectedRoute({
  children,
  requiredPermissions,
  allowedRoles,
  loginPath = '/login',
}: {
  children: React.ReactElement;
  requiredPermissions?: string[];
  allowedRoles?: UserRole[];
  loginPath?: string;
}) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }

  if (requiredPermissions?.length) {
    const allowed = requiredPermissions.every((permission) => canAccess(user?.role, permission));

    if (!allowed) {
      return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
    }
  }

  if (allowedRoles?.length && (!user?.role || !allowedRoles.includes(user.role))) {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
  }

  return children;
}

