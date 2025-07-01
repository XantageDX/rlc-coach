import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

/**
 * RoleBasedRoute - Protects routes based on user roles
 * @param {Array} allowedRoles - Array of roles that can access this route
 * @param {string} fallbackPath - Where to redirect if access is denied (optional)
 */
const RoleBasedRoute = ({ allowedRoles, fallbackPath = null }) => {
  const { currentUser, loading } = useContext(AuthContext);
  
  // Show loading indicator while checking authentication
  if (loading) {
    return <div>Loading...</div>;
  }
  
  // If not authenticated, this should be caught by ProtectedRoute first
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  // Check if user's role is in the allowed roles list
  const hasAccess = allowedRoles.includes(currentUser.role);
  
  if (!hasAccess) {
    // Determine where to redirect based on user role
    const redirectPath = fallbackPath || getDefaultPathForRole(currentUser.role);
    return <Navigate to={redirectPath} replace />;
  }
  
  // User has access, render the protected component
  return <Outlet />;
};

/**
 * Helper function to determine the default accessible path for each role
 * @param {string} role - User's role
 * @returns {string} - Default path for the role
 */
const getDefaultPathForRole = (role) => {
  switch (role) {
    case 'super_admin':
      return '/ai-coach'; // Super admin can go anywhere, default to AI Coach
    case 'tenant_admin':
      return '/ai-coach'; // Tenant admin default to AI Coach
    case 'user':
      return '/ai-coach'; // Regular user default to AI Coach
    default:
      return '/ai-coach'; // Fallback to AI Coach
  }
};

/**
 * Helper function to check if a user role has access to a specific route
 * Used for conditional rendering in components
 * @param {string} userRole - Current user's role
 * @param {string} routePath - Route path to check
 * @returns {boolean} - Whether the user has access
 */
export const hasRouteAccess = (userRole, routePath) => {
  const routePermissions = {
    '/ai-coach': ['super_admin', 'tenant_admin', 'user'],
    '/report-writer': ['super_admin', 'tenant_admin', 'user'],
    '/archive': ['super_admin'], // Only super_admin
    '/user-admin': ['super_admin', 'tenant_admin']
  };
  
  const allowedRoles = routePermissions[routePath] || [];
  return allowedRoles.includes(userRole);
};

/**
 * Helper function to get all accessible routes for a user role
 * Used for navigation menu filtering
 * @param {string} userRole - Current user's role
 * @returns {Array} - Array of accessible route paths
 */
export const getAccessibleRoutes = (userRole) => {
  const allRoutes = ['/ai-coach', '/report-writer', '/archive', '/user-admin'];
  return allRoutes.filter(route => hasRouteAccess(userRole, route));
};

export default RoleBasedRoute;