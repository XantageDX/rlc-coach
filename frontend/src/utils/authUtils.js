// Authentication utility functions
// Location: frontend/src/utils/authUtils.js

/**
 * Safe localStorage access with error handling
 */
export const safeGetUser = () => {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      localStorage.removeItem('user'); // Clean up corrupted data
      return null;
    }
  };
  
  /**
   * Check if current token is valid (without requiring AuthContext)
   */
  export const isTokenValid = (user = null) => {
    const currentUser = user || safeGetUser();
    
    if (!currentUser || !currentUser.access_token) {
      return false;
    }
    
    try {
      const tokenPayload = JSON.parse(atob(currentUser.access_token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      // 30 second buffer for safety
      return tokenPayload.exp > (currentTime + 30);
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  };
  
  /**
   * Get token expiration time
   */
  export const getTokenExpiration = (user = null) => {
    const currentUser = user || safeGetUser();
    
    if (!currentUser || !currentUser.access_token) {
      return null;
    }
    
    try {
      const tokenPayload = JSON.parse(atob(currentUser.access_token.split('.')[1]));
      return new Date(tokenPayload.exp * 1000);
    } catch (error) {
      console.error('Error getting token expiration:', error);
      return null;
    }
  };
  
  /**
   * Get time until token expires (in minutes)
   */
  export const getTimeUntilExpiration = (user = null) => {
    const expiration = getTokenExpiration(user);
    if (!expiration) return 0;
    
    const now = new Date();
    const diffMs = expiration.getTime() - now.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60)));
  };
  
  /**
   * Check if error is authentication related
   */
  export const isAuthError = (error, response = null) => {
    if (response?.status === 401) return true;
    
    if (error) {
      const errorMessage = error.message?.toLowerCase() || '';
      return (
        errorMessage.includes('401') ||
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('session expired') ||
        errorMessage.includes('token expired') ||
        errorMessage.includes('invalid token')
      );
    }
    
    return false;
  };
  
  /**
   * Create auth headers with validation
   */
  export const createAuthHeaders = (additionalHeaders = {}) => {
    const user = safeGetUser();
    
    if (!user || !isTokenValid(user)) {
      return null;
    }
    
    return {
      'Authorization': `Bearer ${user.access_token}`,
      'Content-Type': 'application/json',
      ...additionalHeaders
    };
  };
  
  /**
   * Safe API call wrapper with authentication and error handling
   */
  export const authenticatedRequest = async (url, options = {}, onAuthError = null) => {
    const headers = createAuthHeaders(options.headers);
    
    if (!headers) {
      const error = new Error('Session expired. Please log in again.');
      error.isAuthError = true;
      throw error;
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers
      });
      
      // Handle authentication errors
      if (response.status === 401) {
        const error = new Error('Session expired. Please log in again.');
        error.isAuthError = true;
        error.response = response;
        
        // Call optional auth error handler
        if (onAuthError && typeof onAuthError === 'function') {
          onAuthError(error, response);
        }
        
        throw error;
      }
      
      // Handle other HTTP errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
        error.response = response;
        error.statusCode = response.status;
        throw error;
      }
      
      return response;
    } catch (error) {
      // Network or parsing errors
      if (!error.isAuthError && !error.response) {
        console.error('Network or parsing error:', error);
      }
      throw error;
    }
  };
  
  /**
   * Simplified GET request with auth
   */
  export const authenticatedGet = async (url, onAuthError = null) => {
    const response = await authenticatedRequest(url, { method: 'GET' }, onAuthError);
    return response.json();
  };
  
  /**
   * Simplified POST request with auth
   */
  export const authenticatedPost = async (url, data, onAuthError = null) => {
    const response = await authenticatedRequest(
      url,
      {
        method: 'POST',
        body: JSON.stringify(data)
      },
      onAuthError
    );
    return response.json();
  };
  
  /**
   * Simplified PUT request with auth
   */
  export const authenticatedPut = async (url, data, onAuthError = null) => {
    const response = await authenticatedRequest(
      url,
      {
        method: 'PUT',
        body: JSON.stringify(data)
      },
      onAuthError
    );
    return response.json();
  };
  
  /**
   * Simplified DELETE request with auth
   */
  export const authenticatedDelete = async (url, onAuthError = null) => {
    const response = await authenticatedRequest(url, { method: 'DELETE' }, onAuthError);
    
    // DELETE might not return JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return { success: true };
  };
  
  /**
   * Component helper: Handle API errors with user feedback
   */
  export const handleApiError = (error, setError, logout = null) => {
    console.error('API Error:', error);
    
    if (isAuthError(error)) {
      // Authentication error
      if (logout && typeof logout === 'function') {
        logout('token_expired');
      } else {
        // Fallback: clear localStorage if no logout function provided
        localStorage.removeItem('user');
        window.location.reload();
      }
      
      if (setError) {
        setError('Your session has expired. Please log in again.');
      }
    } else {
      // Other errors
      const message = error.message || 'An unexpected error occurred';
      if (setError) {
        setError(message);
      }
    }
  };
  
  /**
   * Hook-like helper for components to handle auth state
   */
  export const createAuthStateHandler = (setError, logout) => {
    return {
      handleAuthError: (error, response = null) => handleApiError(error, setError, logout),
      
      safeApiCall: async (apiFunction, fallbackMessage = 'Operation failed') => {
        try {
          return await apiFunction();
        } catch (error) {
          handleApiError(error, setError, logout);
          throw error;
        }
      },
      
      isAuthenticated: () => isTokenValid(),
      
      getTimeRemaining: () => getTimeUntilExpiration()
    };
  };
  
  /**
   * Format time until expiration for UI display
   */
  export const formatTimeUntilExpiration = (user = null) => {
    const minutes = getTimeUntilExpiration(user);
    
    if (minutes <= 0) return 'Expired';
    if (minutes < 60) return `${minutes}m`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h ${remainingMinutes}m`;
  };
  
  /**
   * Constants for common API endpoints
   */
  export const API_ENDPOINTS = {
    BASE_URL: 'https://api.spark.rapidlearningcycles.com',
    AUTH: {
      LOGIN: '/auth/token',
      REGISTER: '/auth/register'
    },
    ADMIN: {
      USERS: '/admin/users',
      TENANTS: '/admin/tenants'
    },
    TOKEN_USAGE: {
      ALL: '/token-usage/usage-all',
      REFRESH: '/token-usage/refresh-usage',
      LIMIT: '/token-usage/limit'
    }
  };
  
  /**
   * Build full API URL
   */
  export const buildApiUrl = (endpoint) => {
    return `${API_ENDPOINTS.BASE_URL}${endpoint}`;
  };
  
  export default {
    safeGetUser,
    isTokenValid,
    getTokenExpiration,
    getTimeUntilExpiration,
    isAuthError,
    createAuthHeaders,
    authenticatedRequest,
    authenticatedGet,
    authenticatedPost,
    authenticatedPut,
    authenticatedDelete,
    handleApiError,
    createAuthStateHandler,
    formatTimeUntilExpiration,
    API_ENDPOINTS,
    buildApiUrl
  };