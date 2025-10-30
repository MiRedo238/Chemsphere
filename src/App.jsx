// App.jsx
import React, { useState, useEffect, useContext } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔄 Processing OAuth callback...');
        
        // Get the URL hash fragments
        const hash = window.location.hash;
        console.log('📋 Hash:', hash);
        
        if (!hash || !hash.includes('access_token')) {
          console.log('❌ No access token in URL hash');
          setError('No authentication token found');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        console.log('🔑 OAuth callback detected with access token');
        
        // Wait a moment for Supabase to process the URL
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Let Supabase handle the token extraction and session creation
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Auth callback error:', sessionError);
          setError(sessionError.message);
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        if (session?.user) {
          console.log('✅ OAuth successful, user:', session.user.email);
          
          // Clear the hash from URL
          window.location.hash = '';
          
          // Wait a moment for the auth context to update
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Navigate to dashboard
          navigate('/dashboard', { replace: true });
        } else {
          console.log('❌ No session after OAuth callback');
          setError('Authentication failed - no session created');
          setTimeout(() => navigate('/login'), 2000);
        }
      } catch (error) {
        console.error('❌ Error in auth callback:', error);
        setError(error.message);
        setTimeout(() => navigate('/login'), 2000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="app-loading">
      <div className="spinner"></div>
      {error ? (
        <div>
          <p style={{ color: 'red' }}>Authentication Error</p>
          <p style={{ fontSize: '14px' }}>{error}</p>
          <p style={{ fontSize: '12px' }}>Redirecting to login...</p>
        </div>
      ) : (
        <p>Completing authentication...</p>
      )}
    </div>
  );
}

// Main Dashboard Component (Protected)
function DashboardContent() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedItem, setSelectedItem] = useState(null);
  const { user, userRole } = useAuth();

  // Use DatabaseContext for real data
  const { 
    chemicals, 
    equipment, 
    setChemicals, 
    setEquipment, 
    fetchChemicals,
    fetchEquipment
  } = useContext(DatabaseContext);

  // Sync activeSection with currentView
  useEffect(() => {
    // Map sidebar sections to views
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
  
  // When navigating to detail view
  const handleViewDetail = (item, fromSection) => {
    setPreviousView(fromSection); // Store which section we came from
    setSelectedItem(item);
    setCurrentView('detail');
  };

  // When navigating back
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
    // TODO: Implement audit log functionality
  };

  const refreshData = async () => {
    // TODO: Implement data refresh
    console.log('Refreshing data...');
  };

  const handleSetCurrentView = (view) => {
    setPreviousView(currentView); // Store current view as previous before changing
    setCurrentView(view);
    // Update active section based on view
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

  // Update when setting selected item to track where we're coming from
  const handleSetSelectedItem = (item, fromView = null) => {
    if (fromView) {
      setPreviousView(fromView); // Store the specific view we're coming from
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
          updateChemicals={setChemicals} // This should update the context
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
      {/* Mobile Menu Button */}
      <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar Component */}
      <Sidebar 
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        user={user} 
        userRole={userRole} 
      />

      {/* Main Content */}
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
  const { user, loading, isLockedOut, error } = useAuth();

  console.log('🔍 App.jsx - Auth State:', { 
    loading, 
    user: user ? user.email : 'null',
    isLockedOut,
    error
  });

  // Show loading screen while checking authentication
  if (loading) {
    console.log('🔍 App.jsx - Showing loading screen');
    return <LoadingScreen />;
  }

  console.log('🔍 App.jsx - Loading complete, rendering app');

  return (
    <DatabaseProvider>
      <Router>
        <div className="app">
          <ErrorBoundary>
            <Routes>
              {/* Public route - redirect to dashboard if already authenticated */}
              <Route 
                path="/login" 
                element={
                  user ? <Navigate to="/dashboard" replace /> : <Login />
                } 
              />
              
              {/* Auth callback route for OAuth */}
              <Route 
                path="/auth/callback" 
                element={<AuthCallback />}
              />
              
              {/* Protected routes */}
              <Route 
                path="/dashboard/*" 
                element={
                  user ? (
                    isLockedOut ? <VerificationPending /> : <DashboardContent />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                } 
              />
              
              {/* Default route */}
              <Route 
                path="/" 
                element={
                  <Navigate to={user ? "/dashboard" : "/login"} replace />
                } 
              />
              
              {/* Catch all route */}
              <Route 
                path="*" 
                element={
                  <Navigate to={user ? "/dashboard" : "/login"} replace />
                } 
              />

              <Route path="/admin" element={
                <RouteGuard requireAdmin={true}>
                  <UserManagement />
                </RouteGuard>
              } />

              <Route path="/unauthorized" element={<Unauthorized />} />
            </Routes>
          </ErrorBoundary>
        </div>
      </Router>
    </DatabaseProvider>
  );
}

export default App;