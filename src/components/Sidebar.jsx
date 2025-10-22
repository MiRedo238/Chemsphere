import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  FlaskConical, 
  TestTube2, 
  Wrench, 
  FileText, 
  ClipboardList, 
  User,
  LayoutDashboard,
  ChevronDown,
  ChevronRight,
  X,
  LogOut,
  AlertTriangle
} from 'lucide-react';

const Sidebar = ({ 
  sidebarOpen, 
  setSidebarOpen, 
  activeSection, 
  setActiveSection, 
  user, 
  userRole 
}) => {
  const { logout } = useAuth();
  const [chemicalsExpanded, setChemicalsExpanded] = useState(false);

  // Capitalize the role
  const getCapitalizedRole = () => {
    if (!userRole) return 'User';
    return userRole.charAt(0).toUpperCase() + userRole.slice(1).toLowerCase();
  };

  // Get display name from Supabase Auth user_metadata
  const getDisplayName = () => {
    const capitalizedRole = getCapitalizedRole();
    
    if (user) {
      // Try to get name from user_metadata (Supabase Auth)
      const userName = user.user_metadata?.name || 
                      user.user_metadata?.full_name || 
                      user.user_metadata?.username;
      
      if (userName) {
        return `${capitalizedRole} ${userName}`;
      }
      
      // Fallback: use email username with nice formatting
      if (user.email) {
        const emailUsername = user.email.split('@')[0];
        const formattedUsername = emailUsername
          .split(/[._]/) // Split by dots or underscores
          .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join(' ');
        
        return `${capitalizedRole} ${formattedUsername}`;
      }
    }
    
    return capitalizedRole;
  };

  // Logout function
   const handleLogout = async () => {
    try {
      await logout();
      setSidebarOpen(false);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', key: 'dashboard' },
    { 
      icon: FlaskConical, 
      label: 'Chemicals', 
      key: 'chemicals',
      hasSubmenu: true,
      submenu: [
        { icon: TestTube2, label: 'Inventory', key: 'stock' },
        { icon: AlertTriangle, label: 'Expired', key: 'expired' }
      ]
    },
    { icon: Wrench, label: 'Equipment', key: 'equipment' },
    { icon: FileText, label: 'Log Chemical Usage', key: 'usage' },
    { icon: ClipboardList, label: 'Audit Logs', key: 'audit' },
    { icon: User, label: 'Manage Users', key: 'users' }
  ];

  const handleMenuClick = (item) => {
    if (item.hasSubmenu) {
      setChemicalsExpanded(!chemicalsExpanded);
    } else {
      setActiveSection(item.key);
      setSidebarOpen(false);
    }
  };

  const handleSubmenuClick = (key) => {
    setActiveSection(key);
    setSidebarOpen(false);
  };

  return (
    <>
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h1>Chemsphere</h1>
          <p>{getDisplayName()}</p>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <div key={item.key}>
              <button
                className={`nav-item ${activeSection === item.key ? 'active' : ''}`}
                onClick={() => handleMenuClick(item)}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
                {item.hasSubmenu && (
                  <span className="submenu-icon">
                    {chemicalsExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </span>
                )}
              </button>
              
              {item.hasSubmenu && chemicalsExpanded && (
                <div className="submenu">
                  {item.submenu.map((subItem) => (
                    <button
                      key={subItem.key}
                      className={`submenu-item ${activeSection === subItem.key ? 'active' : ''}`}
                      onClick={() => handleSubmenuClick(subItem.key)}
                    >
                      <subItem.icon size={16} />
                      <span>{subItem.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          {/* Logout Button - Added at the bottom */}
          <div className="mt-auto pt-4 border-t border-gray-700">
            <button
              className="nav-item text-red-400 hover:bg-red-900 hover:bg-opacity-20"
              onClick={handleLogout}
            >
              <LogOut size={20} />
              <span>Log Out</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)}></div>}
    </>
  );
};

export default Sidebar;