import React, { useState, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useModel } from '../../context/ModelContext';
import logo from '../../assets/powered_by_xantage.png';
import sparkLogo from '../../assets/Pagina 2.png';
import { MdSmartToy, MdDescription, MdArchive, MdAdminPanelSettings } from 'react-icons/md';


const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { currentUser } = useContext(AuthContext);
  const { selectedModel, setSelectedModel, models } = useModel();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Toggle sidebar function
  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Function to check if a path is active
  const isActivePath = (path) => {
    return location.pathname.includes(path);
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
        
        <ul className="nav-menu">
          {/* Main navigation items with icons */}
          <li className={isActivePath('/ai-coach') ? 'active' : ''}>
            <Link to="/ai-coach">
              <span className="nav-icon">
                <MdSmartToy size={24} />
              </span>
              {!isCollapsed && <span className="nav-text">AI Coach</span>}
            </Link>
          </li>
          
          <li className={isActivePath('/report-writer') ? 'active' : ''}>
            <Link to="/report-writer">
              <span className="nav-icon">
                <MdDescription size={24} />
              </span>
              {!isCollapsed && <span className="nav-text">Report Writer</span>}
            </Link>
          </li>
          
          <li className={isActivePath('/archive') ? 'active' : ''}>
            <Link to="/archive">
              <span className="nav-icon">
                <MdArchive size={24} />
              </span>
              {!isCollapsed && <span className="nav-text">Archive</span>}
            </Link>
          </li>
          
          <li className={isActivePath('/user-admin') ? 'active' : ''}>
            <Link to="/user-admin">
              <span className="nav-icon">
                <MdAdminPanelSettings size={24} />
              </span>
              {!isCollapsed && <span className="nav-text">User Admin</span>}
            </Link>
          </li>
        </ul>
      </div>

      {/* MIDDLE SECTION */}
      <div className="sidebar-section sidebar-middle">
        {/* Model selector dropdown - Only show when not collapsed */}
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
      </div>
      
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