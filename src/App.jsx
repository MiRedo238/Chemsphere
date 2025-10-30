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

// AuthCallback component for handling OAuth redirects
function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔄 Processing OAuth callback...');
        setStatus('processing');
        
        const hash = window.location.hash;
        
        if (!hash || !hash.includes('access_token')) {
          console.log('❌ No access token in URL');
          setStatus('error');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        console.log('🔑 OAuth tokens detected in URL');
        
        // Give Supabase time to process the URL hash
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verify session was created
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Session error:', error);
          setStatus('error');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        if (session?.user) {
          console.log('✅ OAuth successful:', session.user.email);
          setStatus('success');
          
          // Clear hash
          window.location.hash = '';
          
          // Wait for auth context to update
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Navigate to dashboard
          navigate('/dashboard', { replace: true });
        } else {
          console.log('❌ No session created');
          setStatus('error');
          setTimeout(() => navigate('/login'), 2000);
        }
      } catch (error) {
        console.error('❌ Callback error:', error);
        setStatus('error');
        setTimeout(() => navigate('/login'), 2000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="app-loading">
      <div className="spinner"></div>
      {status === 'processing' && <p>Completing authentication...</p>}
      {status === 'success' && <p>Success! Redirecting...</p>}
      {status === 'error' && <p>Authentication failed. Redirecting to login...</p>}
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
      'equipment': 'equipment',
      'usage': 'log-usage',
      'audit': 'audit-logs',
      'users': 'users'
    };

    if (sectionToViewMap[activeSection]) {
      setCurrentView(sectionToViewMap[activeSection]);
    }
  }, [activeSection]);

  useEffect(() => {
    if (fetchChemicals) fetchChemicals();
    if (fetchEquipment) fetchEquipment();
  }, [fetchChemicals, fetchEquipment]);

  const [previousView, setPreviousView] = useState('chemicals'); 
  
  const handleViewDetail = (item, fromSection) => {
    setPreviousView(fromSection);
    setSelectedItem(item);
    setCurrentView('detail');
  };

  const handleBack = () => {
    setCurrentView(previousView);
    setSelectedItem(null);
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
  };

  const handleSetCurrentView = (view) => {
    setPreviousView(currentView);
    setCurrentView(view);
    const viewToSectionMap = {
      'dashboard': 'dashboard',
      'chemicals': 'chemicals',
      'equipment': 'equipment',
      'log-usage': 'usage',
      'audit-logs': 'audit',
      'expired-chemicals': 'expired',
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
            updateEquipment={updateEquipmentList}
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
            updateChemicals={updateChemicals}
            updateEquipment={updateEquipmentList}
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
            updateChemicals={setChemicals}
            addAuditLog={addAuditLog}
            refreshData={refreshData}
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