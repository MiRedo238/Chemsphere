// App.jsx
import React, { useState, useEffect, useContext } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
  const { user, loading, isLockedOut } = useAuth();

  console.log('🔍 App.jsx - Auth State:', { 
    loading, 
    user: user ? user.email : 'null',
    isLockedOut
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
            {/* Public route - redirect to dashboard if already authenticated and verified */}
            <Route 
              path="/login" 
              element={
                user && !isLockedOut ? <Navigate to="/dashboard" replace /> : <Login />
              } 
            />
            
            {/* Protected routes - redirect to appropriate screens */}
            <Route 
              path="/dashboard" 
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
                <Navigate to={user ? (isLockedOut ? "/dashboard" : "/dashboard") : "/login"} replace />
              } 
            />
            
            {/* Catch all route */}
            <Route 
              path="*" 
              element={
                <Navigate to={user ? (isLockedOut ? "/dashboard" : "/dashboard") : "/login"} replace />
              } 
            />

            <Route path="/admin" element={
              <RouteGuard requireAdmin={true}>
                <UserManagement />
              </RouteGuard>
            } />

            <Route path="/dashboard" element={
              <RouteGuard>
                <Dashboard />
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