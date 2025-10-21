import React, { useState } from 'react';
import { 
  Beaker, 
  Package, 
  Wrench, 
  FileText, 
  ClipboardList, 
  User,
  LayoutDashboard,
  ChevronDown,
  ChevronRight,
  X
} from 'lucide-react';

const Sidebar = ({ sidebarOpen, setSidebarOpen, activeSection, setActiveSection }) => {
  const [chemicalsExpanded, setChemicalsExpanded] = useState(false);
  const [username, setUsername] = useState('User name');

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', key: 'dashboard' },
    { 
      icon: Beaker, 
      label: 'Chemicals', 
      key: 'chemicals',
      hasSubmenu: true,
      submenu: [
        { label: 'Stock', key: 'stock' },
        { label: 'Expired', key: 'expired' }
      ]
    },
    { icon: Wrench, label: 'Equipment', key: 'equipment' },
    { icon: FileText, label: 'Chemical Usage', key: 'usage' },
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
          <p>Logged in as: {username}</p>
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
                      <Package size={16} />
                      <span>{subItem.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)}></div>}
    </>
  );
};

export default Sidebar;