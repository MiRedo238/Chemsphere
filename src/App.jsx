// App.jsx - Fixed version
import React, { useState, useEffect, useContext } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Plus, Menu, X } from 'lucide-react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import ChemicalsList from './components/ChemicalsList';
import EquipmentList from './components/EquipmentList';
import DetailView from './components/DetailView';
import LogChemicalUsage from './components/LogChemicalUsage';
import LogUsageDetailView from './components/LogUsageDetailView'; // Add this import
import AuditLogs from './components/AuditLogs';
import ExpiredChemicals from './components/ExpiredChemicals';
import './App.css';
import { DatabaseProvider, DatabaseContext } from './contexts/DatabaseContext';
import ErrorBoundary from './components/ErrorBoundary';
import UserManagement from './components/UserManagement';
import RouteGuard from './components/RouteGuard';
import Unauthorized from './pages/Unauthorized';
import VerificationPending from './components/VerificationPending';
import { supabase } from './lib/supabase/supabaseClient';
import OpenedChemicals from './components/OpenedChemicals';

// AuthCallback component for handling OAuth redirects
function AuthCallback() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Just wait for the auth context to process the OAuth callback
    if (!loading) {
      if (user) {
        console.log('✅ OAuth successful, redirecting to dashboard');
        navigate('/dashboard', { replace: true });
      } else {
        console.log('❌ OAuth failed, redirecting to login');
        navigate('/login', { replace: true });
      }
    }
  }, [user, loading, navigate]);

  return (
    <div className="app-loading">
      <div className="spinner"></div>
      <p>Completing authentication...</p>
    </div>
  );
}

// Protected Route wrapper that waits for auth to be ready
function ProtectedRoute({ children }) {
  const { user, loading, isLockedOut } = useAuth();
  const location = useLocation();

  console.log('🛡️ ProtectedRoute check:', { 
    user: user?.email, 
    loading, 
    isLockedOut,
    path: location.pathname 
  });

  // Still loading - show loading screen
  if (loading) {
    console.log('⏳ Auth still loading...');
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!user) {
    console.log('❌ No user, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // User is locked out - show verification pending
  if (isLockedOut) {
    console.log('🔒 User locked out');
    return <VerificationPending />;
  }

  // All good - render children
  console.log('✅ User authenticated and verified');
  return children;
}

// Main Dashboard Component
function DashboardContent() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null); // Add state for selected log
  const { user, userRole } = useAuth();

  const { 
    chemicals, 
    equipment, 
    setChemicals, 
    setEquipment, 
    fetchChemicals,
    fetchEquipment
  } = useContext(DatabaseContext);

  useEffect(() => {
    const sectionToViewMap = {
      'dashboard': 'dashboard',
      'chemicals': 'chemicals',
      'stock': 'chemicals',
      'expired': 'expired-chemicals',
      'opened': 'opened-chemicals',
      'equipment': 'equipment',
      'usage': 'log-usage',
      'audit': 'audit-logs',
      'users': 'users'
    };

    if (sectionToViewMap[activeSection]) {
      setCurrentView(sectionToViewMap[activeSection]);
    }
  }, [activeSection]);

  // No automatic fetch here — DatabaseContext loads data and keeps it in sync

  const [previousView, setPreviousView] = useState('chemicals'); 
  
  const handleViewDetail = (item, fromSection) => {
    setPreviousView(fromSection);
    setSelectedItem(item);
    setCurrentView('detail');
  };

  // Add function to handle log detail view
  const handleViewLogDetail = (log, fromView = 'log-usage') => {
    setSelectedLog(log);
    setPreviousView(fromView);
    setCurrentView('log-detail');
  };

  const handleBack = () => {
    setCurrentView(previousView);
    setSelectedItem(null);
    setSelectedLog(null); // Clear selected log when going back
  };

  const updateChemicals = (updatedChemicals) => {
    setChemicals(updatedChemicals);
  };

  const updateEquipmentList = (updatedEquipment) => {
    setEquipment(updatedEquipment);
  };

  const addAuditLog = (log) => {
    console.log('Audit Log:', log);
  };

  const refreshData = async () => {
    console.log('Refreshing data...');
    if (fetchChemicals) await fetchChemicals();
    if (fetchEquipment) await fetchEquipment();
  };

  const handleSetCurrentView = (view) => {
    setPreviousView(currentView);
    setCurrentView(view);
    const viewToSectionMap = {
      'dashboard': 'dashboard',
      'chemicals': 'chemicals',
      'equipment': 'equipment',
      'log-usage': 'usage',
      'log-detail': 'usage', // Add mapping for log detail view
      'audit-logs': 'audit',
      'expired-chemicals': 'expired',
      'opened-chemicals': 'opened',
      'users': 'users'
    };
    
    if (viewToSectionMap[view]) {
      setActiveSection(viewToSectionMap[view]);
    }
  };

  const handleSetSelectedItem = (item, fromView = null) => {
    if (fromView) {
      setPreviousView(fromView);
    }
    setSelectedItem(item);
    handleSetCurrentView('detail');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard 
            userRole={userRole}
            refreshData={refreshData}
          />
        );

      case 'chemicals':
        return (
          <ChemicalsList
            setSelectedItem={(item) => handleSetSelectedItem(item, 'chemicals')}
            setCurrentView={handleSetCurrentView}
            userRole={userRole}
            refreshData={refreshData}
          />
        );

      case 'equipment':
        return (
          <EquipmentList
            equipment={equipment}
            setSelectedItem={(item) => handleSetSelectedItem(item, 'equipment')}
            setCurrentView={handleSetCurrentView}
            userRole={userRole}
            addAuditLog={addAuditLog}
          />
        );

      case 'detail':
        return (
          <DetailView
            selectedItem={selectedItem}
            setCurrentView={handleSetCurrentView}
            userRole={userRole}
            chemicals={chemicals}
            equipment={equipment}
            addAuditLog={addAuditLog}
            refreshData={refreshData}
          />
        );

      case 'log-usage':
        return (
          <LogChemicalUsage
            chemicals={chemicals}
            setCurrentView={handleSetCurrentView}
            addAuditLog={addAuditLog}
            userRole={userRole}
            currentUser={{ name: 'Current User' }}
            refreshData={refreshData}
            onViewLogDetail={handleViewLogDetail} // Pass the handler
          />
        );

      case 'log-detail': // Add this case for log detail view
        return (
          <LogUsageDetailView
            selectedLog={selectedLog}
            setCurrentView={handleSetCurrentView}
            userRole={userRole}
            refreshData={refreshData}
          />
        );

      case 'audit-logs':
        return (
          <AuditLogs
            setCurrentView={handleSetCurrentView}
            userRole={userRole}
          />
        );

      case 'expired-chemicals':
        return (
          <ExpiredChemicals 
            setSelectedItem={(item) => handleSetSelectedItem(item, 'expired-chemicals')}
            setCurrentView={setCurrentView}
            userRole={userRole}
            addAuditLog={addAuditLog}
            refreshData={refreshData}
          />
        );

        case 'opened-chemicals':
          return (
            <OpenedChemicals 
              setCurrentView={handleSetCurrentView}
              userRole={userRole}
              refreshData={refreshData}
              addAuditLog={addAuditLog}
              onViewLogDetail={handleViewLogDetail}
            />
          );

      case 'users':
        if (userRole !== 'admin') {
          return (
            <div className="p-6">
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                Access denied. Admin privileges required.
              </div>
            </div>
          );
        }
        return <UserManagement />;

      default:
        return (
          <div className="dashboard-grid">
            {/* Default dashboard content */}
          </div>
        );
    }
  };

  return (
    <div className="dashboard">
      <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <Sidebar 
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        user={user} 
        userRole={userRole} 
      />

      <main className="main-content">
        <header className="top-bar">
          {currentView === 'dashboard' && (
            <>
              <button className="add-btn" onClick={() => handleSetCurrentView('log-usage')}>
                <Plus size={20} />
                Log Chemical Usage
              </button>
            </>
          )}
        </header>

        <div className="content-area">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

// Loading Component
function LoadingScreen() {
  return (
    <div className="app-loading">
      <div className="spinner"></div>
      <p>Loading ChemSphere...</p>
    </div>
  );
}

// Main App Component with Routing
function App() {
  const { user, loading } = useAuth();

  console.log('🎯 App render - User:', user?.email, 'Loading:', loading);

  // IMPORTANT: Don't show loading screen - let routes handle it
  // This prevents the flash and routing issues

  return (
    <DatabaseProvider>
      <Router>
        <div className="app">
          <ErrorBoundary>
            <Routes>
              {/* Public route */}
              <Route 
                path="/login" 
                element={
                  !loading && user ? (
                    <Navigate to="/dashboard" replace />
                  ) : (
                    <Login />
                  )
                } 
              />
              
              {/* Auth callback route */}
              <Route 
                path="/auth/callback" 
                element={<AuthCallback />}
              />
              
              {/* Protected routes */}
              <Route 
                path="/dashboard/*" 
                element={
                  <ProtectedRoute>
                    <DashboardContent />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/admin" 
                element={
                  <RouteGuard requireAdmin={true}>
                    <UserManagement />
                  </RouteGuard>
                } 
              />

              <Route path="/unauthorized" element={<Unauthorized />} />
              
              {/* Default route - use ProtectedRoute logic */}
              <Route 
                path="/" 
                element={
                  loading ? (
                    <LoadingScreen />
                  ) : user ? (
                    <Navigate to="/dashboard" replace />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                } 
              />
              
              {/* Catch all */}
              <Route 
                path="*" 
                element={
                  loading ? (
                    <LoadingScreen />
                  ) : user ? (
                    <Navigate to="/dashboard" replace />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                } 
              />
            </Routes>
          </ErrorBoundary>
        </div>
      </Router>
    </DatabaseProvider>
  );
}

export default App;