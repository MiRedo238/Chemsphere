import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const RouteGuard = ({ children, requireAdmin = false }) => {
  const { user, userVerified, userActive, isAdmin, userRole, loading, isLockedOut, isAdminOrSuperAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      const canAccessSystem = user && userVerified && userActive;

      if (!canAccessSystem || isLockedOut) {
        navigate('/unauthorized', {
          state: {
            message: 'Your account is pending verification or has been deactivated.',
          },
        });
      } 
      // Allow both admin and super_admin if requireAdmin is true
      else if (requireAdmin && !isAdminOrSuperAdmin) {
        navigate('/unauthorized', {
          state: {
            message: 'Admin or Super Admin privileges required to access this page.',
          },
        });
      }
    }
  }, [user, userVerified, userActive, isAdmin, userRole, loading, navigate, requireAdmin, isLockedOut]);

  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }

  const canAccessSystem = user && userVerified && userActive && !isLockedOut;
  const hasRequiredRole = !requireAdmin || isAdminOrSuperAdmin;

  if (!canAccessSystem || !hasRequiredRole) {
    return null;
  }

  return children;
};

export default RouteGuard;
