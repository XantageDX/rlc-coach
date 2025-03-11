import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const ProtectedRoute = () => {
  const { currentUser, loading } = useContext(AuthContext);
  
  // Show loading indicator while checking authentication
  if (loading) {
    return <div>Loading...</div>;
  }
  
  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  // Render the protected component
  return <Outlet />;
};

export default ProtectedRoute;