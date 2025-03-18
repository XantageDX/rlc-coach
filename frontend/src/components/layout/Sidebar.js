import React, { useState, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import logo from '../../assets/powered_by_xantage.png';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Toggle sidebar function
  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
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
        {/* Main navigation items - only the required four */}
        <li>
          <Link to="/ai-coach">AI Coach</Link>
        </li>
        
        <li>
          <Link to="/report-writer">Report Writer</Link>
        </li>
        
        <li>
          <Link to="/archive">Archive</Link>
        </li>
        
        <li>
          <Link to="/user-admin">User Admin</Link>
        </li>
      </ul>
      
      {/* Logo at the bottom of sidebar */}
      <div className="sidebar-logo">
        <img src={logo} alt="Xantage logo" />
      </div>
    </div>
  );
};

export default Sidebar;