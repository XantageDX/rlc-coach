import React, { useState, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useModel } from '../../context/ModelContext';
import logo from '../../assets/powered_by_xantage.png';
import sparkLogo from '../../assets/RLC white transparent background arrow only.png';
// import sparkLogo from '../../assets/RLCI Logo Only Reversed.jpg'; // SMALL LOGO
// import sparkLogo from '../../assets/RLCI Horizontal Logo Reversed.png'; // BIG LOGO
// import sparkLogoHorizontal from '../../assets/RLCI Horizontal Logo Reversed.png';
// import sparkLogoCircular from '../../assets/RLC white transparent background arrow only.png';
import { MdSmartToy, MdDescription, MdArchive, MdAdminPanelSettings } from 'react-icons/md';
import { getAccessibleNavigationItems } from '../../utils/rolePermissions';


const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { currentUser } = useContext(AuthContext);
  const { selectedModel, setSelectedModel, models } = useModel();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get accessible navigation items based on user role
  const accessibleNavItems = currentUser ? getAccessibleNavigationItems(currentUser.role) : [];
  
  // Icon mapping for dynamic icon rendering
  const iconMap = {
    'MdSmartToy': MdSmartToy,
    'MdDescription': MdDescription,
    'MdArchive': MdArchive,
    'MdAdminPanelSettings': MdAdminPanelSettings
  };
  
  // Toggle sidebar function
  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Function to check if a path is active
  const isActivePath = (path) => {
    return location.pathname.includes(path);
  };

  // Render navigation icon dynamically
  const renderIcon = (iconName, size = 24) => {
    const IconComponent = iconMap[iconName];
    return IconComponent ? <IconComponent size={size} /> : null;
  };

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Sidebar toggle button */}
      <button
        className="sidebar-toggle"
        onClick={toggleSidebar}
        aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? '»' : '«'}
      </button>

      {/* TOP SECTION */}
      <div className="sidebar-section sidebar-top">
        {/* Updated branded header with Spark logo */}
        <div className="sidebar-brand">
          {!isCollapsed ? (
            <div className="brand-text">
              <div className="brand-logo">
                <img src={sparkLogo} alt="Spark logo" className="spark-logo" />
              </div>
              <div className="brand-name">
                <span>Rapid Learning Cycles</span>
                <span>Spark</span>
              </div>
            </div>
          ) : (
            <div className="brand-icon">
              <img src={sparkLogo} alt="Spark logo" className="spark-logo" />
            </div>
          )}
        </div>

        {/* Dynamic Navigation Menu based on user role */}
        <ul className="nav-menu">
          {accessibleNavItems.map((navItem) => (
            <li key={navItem.path} className={isActivePath(navItem.path) ? 'active' : ''}>
              <Link to={navItem.path}>
                <span className="nav-icon">
                  {renderIcon(navItem.icon, 24)}
                </span>
                {!isCollapsed && <span className="nav-text">{navItem.label}</span>}
              </Link>
            </li>
          ))}
        </ul>

        {/* Debug info (only show in development) */}
        {process.env.NODE_ENV === 'development' && currentUser && !isCollapsed && (
          <div style={{ 
            fontSize: '0.7rem', 
            color: '#ccc', 
            padding: '10px 15px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            marginTop: '10px'
          }}>
            Role: {currentUser.role}<br/>
            Items: {accessibleNavItems.length}
          </div>
        )}
      </div>

      {/* MIDDLE SECTION - Model Selector (commented out as in original) */}
      {/* <div className="sidebar-section sidebar-middle">
        {!isCollapsed && (
          <div className="model-selector">
            <label htmlFor="model-select">LLM Model:</label>
            <select
              id="model-select"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="model-dropdown"
            >
              {models.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div> */}
      
      {/* BOTTOM SECTION */}
      <div className="sidebar-section sidebar-bottom">
        {/* Logo at the bottom of sidebar - Only show when not collapsed */}
        {!isCollapsed && (
          <div className="sidebar-logo">
            <img src={logo} alt="Xantage logo" />
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;