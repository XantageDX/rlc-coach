import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTokenExpired, setIsTokenExpired] = useState(false);

  // Token validation utilities
  const isTokenValid = (user) => {
    if (!user || !user.access_token) return false;
    
    try {
      // Decode JWT token to check expiration
      const tokenPayload = JSON.parse(atob(user.access_token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Check if token is expired (with 30 second buffer for safety)
      return tokenPayload.exp > (currentTime + 30);
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  };

  const getTokenExpirationTime = (user) => {
    if (!user || !user.access_token) return null;
    
    try {
      const tokenPayload = JSON.parse(atob(user.access_token.split('.')[1]));
      return new Date(tokenPayload.exp * 1000);
    } catch (error) {
      console.error('Error getting token expiration:', error);
      return null;
    }
  };

  // Enhanced logout function with conversation memory control AND LOG
  const logout = (reason = null, clearMemory = false) => {
    const userEmail = currentUser?.email;
    
    console.log('=== LOGOUT DEBUG ===');
    console.log('Reason:', reason);
    console.log('Clear Memory:', clearMemory);
    console.log('User Email:', userEmail);
    console.log('Current localStorage keys:', Object.keys(localStorage));
    
    // Always clear auth data
    localStorage.removeItem('user');
    setCurrentUser(null);
    setIsTokenExpired(false);
    setError(null);
    
    // Clear conversation memory only if explicitly requested
    if (clearMemory && userEmail) {
      console.log('🧹 CLEARING conversation memory for user:', userEmail);
      
      const aiCoachKey = `rlc-aicoach-state-${userEmail}`;
      const reportWriterKey = `rlc-reportwriter-state-${userEmail}`;
      
      console.log('Removing keys:', aiCoachKey, reportWriterKey);
      console.log('Keys before removal:', Object.keys(localStorage).filter(k => k.includes('rlc-')));
      
      localStorage.removeItem(aiCoachKey);
      localStorage.removeItem(reportWriterKey);
      localStorage.removeItem('rlc-aicoach-state-guest');
      localStorage.removeItem('rlc-reportwriter-state-guest');
      
      console.log('Keys after removal:', Object.keys(localStorage).filter(k => k.includes('rlc-')));
      console.log('✅ Memory cleared successfully');
    } else {
      console.log('💾 PRESERVING conversation memory (session expiration or no clearMemory flag)');
    }
    
    if (reason === 'token_expired') {
      setIsTokenExpired(true);
      setError('Your session has expired. Please log in again.');
    }
    
    console.log('=== END LOGOUT DEBUG ===');
  };

  // Handle authentication errors (401 responses)
  const handleAuthError = (error, response = null) => {
    if (response?.status === 401 || error?.message?.includes('401') || error?.message?.includes('unauthorized')) {
      logout('token_expired');
      return true; // Indicates this was an auth error
    }
    return false; // Not an auth error
  };

  // Validate current session
  const validateSession = () => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    if (user && !isTokenValid(user)) {
      logout('token_expired');
      return false;
    }
    
    return !!user;
  };

  // Get authenticated headers for API calls
  const getAuthHeaders = () => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    if (!user || !isTokenValid(user)) {
      logout('token_expired');
      return null;
    }
    
    return {
      'Authorization': `Bearer ${user.access_token}`,
      'Content-Type': 'application/json'
    };
  };

  // Make authenticated API call with automatic error handling
  const authenticatedFetch = async (url, options = {}) => {
    const headers = getAuthHeaders();
    
    if (!headers) {
      throw new Error('Session expired. Please log in again.');
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers
        }
      });
      
      // Handle 401 responses
      if (response.status === 401) {
        handleAuthError(null, response);
        throw new Error('Session expired. Please log in again.');
      }
      
      return response;
    } catch (error) {
      // Check if it's an auth error
      if (handleAuthError(error)) {
        throw new Error('Session expired. Please log in again.');
      }
      throw error;
    }
  };

  // Check if user is already logged in on app load
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    if (user) {
      if (isTokenValid(user)) {
        setCurrentUser(user);
        setIsTokenExpired(false);
      } else {
        // Token is expired, clean up
        logout('token_expired');
      }
    }
    
    setLoading(false);
  }, []);

  // Set up token expiration monitoring
  useEffect(() => {
    if (!currentUser) return;

    const checkTokenExpiration = () => {
      if (!isTokenValid(currentUser)) {
        logout('token_expired');
      }
    };

    // Check token every minute
    const interval = setInterval(checkTokenExpiration, 60000);
    
    return () => clearInterval(interval);
  }, [currentUser]);

  // Login function
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      setIsTokenExpired(false);
      
      const response = await fetch('https://api.spark.rapidlearningcycles.com/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: email,
          password: password,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to login');
      }
      
      // Store user data in local storage
      localStorage.setItem('user', JSON.stringify(data));
      setCurrentUser(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('https://api.spark.rapidlearningcycles.com/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to register');
      }
      
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    currentUser,
    loading,
    error,
    isTokenExpired,
    login,
    register,
    logout,
    validateSession,
    handleAuthError,
    getAuthHeaders,
    authenticatedFetch,
    isTokenValid: () => currentUser ? isTokenValid(currentUser) : false,
    getTokenExpirationTime: () => currentUser ? getTokenExpirationTime(currentUser) : null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};