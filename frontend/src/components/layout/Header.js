import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const Header = () => {
  const { currentUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="app-header">
      <div className="header-container">
        <h1>RLC Coach App</h1>
        
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