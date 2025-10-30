// src/components/RouteGuard.jsx
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const RouteGuard = ({ children, requireAdmin = false, requireVerified = true }) => {
  const { 
    user, 
    userVerified, 
    userActive, 
    isAdmin, 
    loading, 
    isLockedOut,
    sessionChecked 
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [accessChecked, setAccessChecked] = useState(false);

  useEffect(() => {
    if (!loading && sessionChecked) {
      console.log('🛡️ RouteGuard checking access:', {
        user: user?.email,
        userVerified,
        userActive,
        isLockedOut,
        requireAdmin,
        path: location.pathname
      });

      // Redirect to login if no user
      if (!user) {
        console.log('🛡️ No user, redirecting to login');
        navigate('/login', { 
          replace: true,
          state: { from: location } 
        });
        return;
      }

      // Check if user is locked out (not verified or inactive)
      if (requireVerified && isLockedOut) {
        console.log('🛡️ User locked out, redirecting to verification pending');
        navigate('/dashboard', { replace: true });
        return;
      }

      // Check admin privileges if required
      if (requireAdmin && !isAdmin) {
        console.log('🛡️ Admin access required, redirecting to unauthorized');
        navigate('/unauthorized', { 
          replace: true,
          state: { 
            message: 'Admin privileges required to access this page.',
            from: location
          } 
        });
        return;
      }

      // All checks passed
      console.log('🛡️ Access granted');
      setAccessChecked(true);
    }
  }, [
    user, 
    userVerified, 
    userActive, 
    isAdmin, 
    loading, 
    isLockedOut, 
    navigate, 
    requireAdmin, 
    location,
    sessionChecked,
    requireVerified
  ]);

  // Show loading while checking authentication
  if (loading || !sessionChecked) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Checking authentication...</span>
      </div>
    );
  }

  // Show loading while checking access
  if (!accessChecked) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Verifying access...</span>
      </div>
    );
  }

  return children;
};

export default RouteGuard;