import React, { useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { getRoleLabel, USER_ROLES } from '../../utils/rolePermissions';

const Header = () => {
  const { currentUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    console.log('🚪 USER CLICKED LOGOUT - should clear memory');
    logout(null, true); // Voluntary logout - clear memory
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

  // Function to get role badge styling
  const getRoleBadgeClass = (role) => {
    switch (role) {
      case USER_ROLES.SUPER_ADMIN:
        return 'role-badge role-badge-super-admin';
      case USER_ROLES.TENANT_ADMIN:
        return 'role-badge role-badge-tenant-admin';
      case USER_ROLES.USER:
        return 'role-badge role-badge-user';
      default:
        return 'role-badge role-badge-default';
    }
  };

  // Only show role badge for admin roles to avoid clutter for regular users
  const shouldShowRoleBadge = (role) => {
    return [USER_ROLES.SUPER_ADMIN, USER_ROLES.TENANT_ADMIN].includes(role);
  };

  return (
    <header className="app-header">
      <div className="header-container">
        <h1>{getPageTitle()}</h1>
        
        {currentUser && (
          <div className="user-controls">
            <div className="user-info">
              <span className="user-greeting">
                Welcome, {currentUser.first_name} {currentUser.last_name}
              </span>
              
              {/* Role badge - only show for admin roles */}
              {shouldShowRoleBadge(currentUser.role) && (
                <span className={getRoleBadgeClass(currentUser.role)}>
                  {getRoleLabel(currentUser.role)}
                </span>
              )}
            </div>
            
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