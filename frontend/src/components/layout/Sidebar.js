import React, { useState, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useModel } from '../../context/ModelContext';
import logo from '../../assets/powered_by_xantage.png';

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

      <h2>RLC Coach</h2>
      <ul>
        {/* Main navigation items - highlight active page with orange background */}
        <li className={isActivePath('/ai-coach') ? 'active' : ''}>
          <Link to="/ai-coach">AI Coach</Link>
        </li>
        
        <li className={isActivePath('/report-writer') ? 'active' : ''}>
          <Link to="/report-writer">Report Writer</Link>
        </li>
        
        <li className={isActivePath('/archive') ? 'active' : ''}>
          <Link to="/archive">Archive</Link>
        </li>
        
        <li className={isActivePath('/user-admin') ? 'active' : ''}>
          <Link to="/user-admin">User Admin</Link>
        </li>
      </ul>

      {/* Model selector dropdown - Add this section */}
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
      
      {/* Logo at the bottom of sidebar */}
      <div className="sidebar-logo">
        <img src={logo} alt="Xantage logo" />
      </div>
    </div>
  );
};

export default Sidebar;