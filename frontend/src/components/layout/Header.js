import React, { useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const Header = () => {
  const { currentUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Function to get the current page title based on the path
  const getPageTitle = () => {
    const path = location.pathname;
    
    if (path.includes('/ai-coach')) return 'AI Coach';
    if (path.includes('/report-writer')) return 'Report Writer';
    if (path.includes('/archive')) return 'Archive';
    if (path.includes('/user-admin')) return 'User Admin';
    
    // Default title if route doesn't match any of the above
    return 'Spark - Rapid Learning Cycles';
  };

  return (
    <header className="app-header">
      <div className="header-container">
        <h1>{getPageTitle()}</h1>
        
        {currentUser && (
          <div className="user-controls">
            <span className="user-greeting">
              Welcome, {currentUser.first_name} {currentUser.last_name}
            </span>
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;