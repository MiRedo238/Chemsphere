// App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

// Mock data - replace with Supabase queries
const mockData = {
  nearExpiration: [
    { id: 1, name: 'Chemical 1', days: 5 },
    { id: 2, name: 'Chemical 2', days: 20 },
    { id: 3, name: 'Chemical 3', days: 45 },
    { id: 4, name: 'Chemical 4', days: 30 },
    { id: 5, name: 'Chemical 5', days: 15 },
    { id: 6, name: 'Chemical 6', days: 25 },
    { id: 7, name: 'Chemical 7', days: 10 },
    { id: 8, name: 'Chemical 8', days: 35 }
  ],
  lowStock: [
    { id: 1, name: 'Chemical 1', quantity: 3 },
    { id: 2, name: 'Chemical 2', quantity: 4 },
    { id: 3, name: 'Chemical 3', quantity: 10 },
    { id: 4, name: 'Chemical 4', quantity: 2 },
    { id: 5, name: 'Chemical 5', quantity: 5 },
    { id: 6, name: 'Chemical 6', quantity: 8 },
    { id: 7, name: 'Chemical 7', quantity: 1 },
    { id: 8, name: 'Chemical 8', quantity: 6 }
  ],
  expired: [
    { id: 1, name: 'Chemical 1', date: '9/5/25' },
    { id: 2, name: 'Chemical 2', date: '9/5/25' },
    { id: 3, name: 'Chemical 3', date: '7/07/25' },
    { id: 4, name: 'Chemical 4', date: '8/15/25' },
    { id: 5, name: 'Chemical 5', date: '6/20/25' },
    { id: 6, name: 'Chemical 6', date: '7/30/25' },
    { id: 7, name: 'Chemical 7', date: '8/10/25' }
  ],
  outOfStock: [
    { id: 1, name: 'Chemical 1' },
    { id: 2, name: 'Chemical 2' },
    { id: 3, name: 'Chemical 3' },
    { id: 4, name: 'Chemical 4' },
    { id: 5, name: 'Chemical 5' },
    { id: 6, name: 'Chemical 6' },
    { id: 7, name: 'Chemical 7' },
    { id: 8, name: 'Chemical 8' }
  ]
};

// Mock chemicals and equipment data
const mockChemicals = [
  { 
    id: 1, 
    name: 'Sodium Hydroxide', 
    batch_number: 'SH-2024-001', 
    brand: 'LabChem',
    volume: '500mL',
    initial_quantity: 100,
    current_quantity: 45,
    expiration_date: '2025-12-31',
    date_of_arrival: '2024-01-15',
    safety_class: 'corrosive',
    location: 'Lab A - Shelf 2',
    ghs_symbols: ['corrosive', 'toxic'],
    usage_log: [
      { user_name: 'John Doe', location: 'Lab A', quantity: 5, date: '2024-01-20', opened: true },
      { user_name: 'Jane Smith', location: 'Lab B', quantity: 10, date: '2024-02-15', opened: false }
    ]
  }
];

const mockEquipment = [
  {
    id: 1,
    name: 'Microscope',
    model: 'CX23',
    serial_id: 'MIC-001',
    status: 'Available',
    location: 'Lab A',
    purchase_date: '2023-05-10',
    warranty_expiration: '2025-05-10',
    equipment_condition: 'Good',
    last_maintenance: '2024-01-15',
    next_maintenance: '2024-07-15',
    maintenance_log: [
      { action: 'Routine Maintenance', user_name: 'Tech Team', date: '2024-01-15', notes: 'Cleaned and calibrated' }
    ]
  }
];

// Main Dashboard Component (Protected)
function DashboardContent() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedItem, setSelectedItem] = useState(null);
  const [chemicals, setChemicals] = useState(mockChemicals);
  const [equipment, setEquipment] = useState(mockEquipment);
  const { userRole } = useAuth(); // Get real user role from AuthContext

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

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="dashboard-grid">
            {/* Near Expiration Card */}
            <div className="card">
              <div className="card-header">
                <h2>Near Expiration</h2>
                <span className="badge">20</span>
              </div>
              <ul className="card-list">
                {mockData.nearExpiration.map((item) => (
                  <li key={item.id}>
                    <span>{item.name}</span>
                    <span className="days">{item.days} days</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Low Stock Card */}
            <div className="card">
              <div className="card-header">
                <h2>Low stock</h2>
                <span className="badge">30</span>
              </div>
              <ul className="card-list">
                {mockData.lowStock.map((item) => (
                  <li key={item.id}>
                    <span>{item.name}</span>
                    <span className="quantity">{item.quantity} left</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Expired Card */}
            <div className="card">
              <div className="card-header">
                <h2>Expired</h2>
                <span className="badge badge-warning">5</span>
              </div>
              <ul className="card-list">
                {mockData.expired.map((item) => (
                  <li key={item.id}>
                    <span>{item.name}</span>
                    <span className="date">{item.date}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Out of Stock Card */}
            <div className="card">
              <div className="card-header">
                <h2>Out of stock</h2>
                <span className="badge badge-danger">10</span>
              </div>
              <ul className="card-list">
                {mockData.outOfStock.map((item) => (
                  <li key={item.id}>
                    <span>{item.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );

      case 'chemicals':
        return (
          <ChemicalsList
            chemicals={chemicals}
            setSelectedItem={setSelectedItem}
            setCurrentView={handleSetCurrentView}
            userRole={userRole}
            updateChemicals={updateChemicals}
            addAuditLog={addAuditLog}
            refreshData={refreshData}
          />
        );

      case 'equipment':
        return (
          <EquipmentList
            equipment={equipment}
            setSelectedItem={setSelectedItem}
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
          <ExpiredChemicals />
        );

      case 'users':
        return (
          <div className="p-6">
            <div className="detail-header">
              <h1 className="detail-title">User Management</h1>
            </div>
            <div className="bg-white rounded-lg p-6 shadow">
              <p className="text-gray-600">User management functionality coming soon...</p>
            </div>
          </div>
        );

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
      />

      {/* Main Content */}
      <main className="main-content">
        <header className="top-bar">
          {currentView === 'dashboard' && (
            <>
              <button className="add-btn" onClick={() => handleSetCurrentView('log-usage')}>
                <Plus size={20} />
                Log chemical usage
              </button>
            </>
          )}
          {currentView === 'log-usage' && (
            <button className="add-btn" onClick={() => handleSetCurrentView('chemicals')}>
              <Plus size={20} />
              Back to chemicals
            </button>
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
  const { user, loading, userRole } = useAuth();

  console.log('🔍 App.jsx - Auth State:', { 
    loading, 
    user: user ? user.email : 'null', 
    userRole 
  });

  // Show loading screen while checking authentication
  if (loading) {
    console.log('🔍 App.jsx - Showing loading screen');
    return <LoadingScreen />;
  }

  console.log('🔍 App.jsx - Loading complete, rendering app');

  return (
    <Router>
      <div className="app">
        <Routes>
          {/* Public route - redirect to dashboard if already authenticated */}
          <Route 
            path="/login" 
            element={
              user ? <Navigate to="/dashboard" replace /> : <Login />
            } 
          />
          
          {/* Protected routes - redirect to login if not authenticated */}
          <Route 
            path="/dashboard" 
            element={
              user ? <DashboardContent /> : <Navigate to="/login" replace />
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
        </Routes>
      </div>
    </Router>
  );
}

export default App;