// src/components/RouteGuard.jsx
import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const RouteGuard = ({ children, requireAdmin = false }) => {
  const { user, userVerified, userActive, isAdmin, loading, isLockedOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      // Check if user can access the system
      const canAccessSystem = user && userVerified && userActive;
      
      if (!canAccessSystem || isLockedOut) {
        navigate('/unauthorized', { 
          state: { 
            message: 'Your account is pending verification or has been deactivated.' 
          } 
        });
      } else if (requireAdmin && !isAdmin) {
        navigate('/unauthorized', { 
          state: { 
            message: 'Admin privileges required to access this page.' 
          } 
        });
      }
    }
  }, [user, userVerified, userActive, isAdmin, loading, navigate, requireAdmin, isLockedOut]);

  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }

  // Check access conditions
  const canAccessSystem = user && userVerified && userActive && !isLockedOut;
  const hasRequiredRole = !requireAdmin || isAdmin;

  if (!canAccessSystem || !hasRequiredRole) {
    return null;
  }

  return children;
};

export default RouteGuard;