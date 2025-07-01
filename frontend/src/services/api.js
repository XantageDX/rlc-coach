// import axios from 'axios';

// // const API_URL = 'https://api.rapidlearningcycles.xantage.co';
// const API_URL = 'https://api.spark.rapidlearningcycles.com';

// // Create axios instance
// const api = axios.create({
//   baseURL: API_URL,
// });

// // Add request interceptor for adding auth token
// api.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem('token');
//     if (token) {
//       config.headers['Authorization'] = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

// // Auth services
// export const authService = {
//   login: async (username, password) => {
//     const formData = new FormData();
//     formData.append('username', username);
//     formData.append('password', password);
//     const response = await api.post('/token', formData);
//     return response.data;
//   },
//   logout: () => {
//     localStorage.removeItem('token');
//   },
// };

// // Example of a service for projects
// export const projectService = {
//   getAllProjects: async () => {
//     const response = await api.get('/projects');
//     return response.data;
//   },
//   // Add more project methods as needed
// };

// export default api;

//// CENTRALISED CONTEXT

import axios from 'axios';
import { 
  safeGetUser, 
  isTokenValid, 
  isAuthError,
  API_ENDPOINTS 
} from '../utils/authUtils';

const API_URL = 'https://api.spark.rapidlearningcycles.com';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 second timeout
});

// Flag to prevent infinite loops during logout
let isLoggingOut = false;

// Helper function to handle logout
const handleLogout = () => {
  if (isLoggingOut) return;
  
  isLoggingOut = true;
  
  // Clear localStorage
  localStorage.removeItem('user');
  
  // Redirect to login page
  window.location.href = '/login';
  
  // Reset flag after a delay
  setTimeout(() => {
    isLoggingOut = false;
  }, 1000);
};

// Request interceptor - Add auth token to requests
api.interceptors.request.use(
  (config) => {
    // Get user from localStorage (matches AuthContext approach)
    const user = safeGetUser();
    
    // Add token if valid
    if (user && isTokenValid(user)) {
      config.headers['Authorization'] = `Bearer ${user.access_token}`;
    }
    
    // Ensure Content-Type for non-FormData requests
    if (!config.headers['Content-Type'] && !(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle auth errors globally
api.interceptors.response.use(
  (response) => {
    // Request successful, return response
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    
    // Handle different types of errors
    if (error.response) {
      const { status, data } = error.response;
      
      // Handle 401 Unauthorized errors
      if (status === 401) {
        console.warn('401 Unauthorized - Token expired or invalid');
        
        // Don't logout if we're already on login endpoint
        const isLoginRequest = error.config?.url?.includes('/auth/token');
        
        if (!isLoginRequest && !isLoggingOut) {
          handleLogout();
        }
        
        // Return a user-friendly error message
        const authError = new Error('Your session has expired. Please log in again.');
        authError.isAuthError = true;
        authError.originalError = error;
        return Promise.reject(authError);
      }
      
      // Handle other HTTP errors
      if (status >= 400) {
        const errorMessage = data?.detail || data?.message || `HTTP ${status}: ${error.response.statusText}`;
        const apiError = new Error(errorMessage);
        apiError.statusCode = status;
        apiError.originalError = error;
        return Promise.reject(apiError);
      }
    } else if (error.request) {
      // Network error
      const networkError = new Error('Network error. Please check your connection and try again.');
      networkError.isNetworkError = true;
      networkError.originalError = error;
      return Promise.reject(networkError);
    } else {
      // Something else happened
      const unknownError = new Error('An unexpected error occurred. Please try again.');
      unknownError.originalError = error;
      return Promise.reject(unknownError);
    }
    
    return Promise.reject(error);
  }
);

// Enhanced auth services
export const authService = {
  login: async (username, password) => {
    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);
      
      const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, formData);
      return response.data;
    } catch (error) {
      // Re-throw with better error message
      if (error.response?.status === 401) {
        throw new Error('Invalid email or password');
      }
      throw error;
    }
  },
  
  register: async (userData) => {
    try {
      const response = await api.post(API_ENDPOINTS.AUTH.REGISTER, userData);
      return response.data;
    } catch (error) {
      // Re-throw with better error message
      if (error.response?.status === 400) {
        const detail = error.response.data?.detail || 'Registration failed';
        throw new Error(detail);
      }
      throw error;
    }
  },
  
  logout: () => {
    localStorage.removeItem('user');
    // Don't redirect here - let the component handle it
  },
  
  // Check if current user is authenticated
  isAuthenticated: () => {
    const user = safeGetUser();
    return user && isTokenValid(user);
  },
  
  // Get current user info
  getCurrentUser: () => {
    return safeGetUser();
  }
};

// Enhanced project service with error handling
export const projectService = {
  getAllProjects: async () => {
    try {
      const response = await api.get('/projects');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      throw error;
    }
  },
  
  getProject: async (projectId) => {
    try {
      const response = await api.get(`/projects/${projectId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch project ${projectId}:`, error);
      throw error;
    }
  },
  
  createProject: async (projectData) => {
    try {
      const response = await api.post('/projects', projectData);
      return response.data;
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  },
  
  updateProject: async (projectId, projectData) => {
    try {
      const response = await api.put(`/projects/${projectId}`, projectData);
      return response.data;
    } catch (error) {
      console.error(`Failed to update project ${projectId}:`, error);
      throw error;
    }
  },
  
  deleteProject: async (projectId) => {
    try {
      const response = await api.delete(`/projects/${projectId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to delete project ${projectId}:`, error);
      throw error;
    }
  }
};

// Admin services for user management
export const adminService = {
  getAllUsers: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.ADMIN.USERS);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch users:', error);
      throw error;
    }
  },
  
  createUser: async (userData) => {
    try {
      const response = await api.post(API_ENDPOINTS.ADMIN.USERS, userData);
      return response.data;
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  },
  
  deleteUser: async (email) => {
    try {
      const response = await api.delete(`${API_ENDPOINTS.ADMIN.USERS}/${email}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to delete user ${email}:`, error);
      throw error;
    }
  },
  
  getAllTenants: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.ADMIN.TENANTS);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
      throw error;
    }
  }
};

// Token usage services
export const tokenUsageService = {
  getAllUsage: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.TOKEN_USAGE.ALL);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch token usage:', error);
      throw error;
    }
  },
  
  refreshUsage: async () => {
    try {
      const response = await api.post(API_ENDPOINTS.TOKEN_USAGE.REFRESH);
      return response.data;
    } catch (error) {
      console.error('Failed to refresh token usage:', error);
      throw error;
    }
  },
  
  updateTokenLimit: async (tenantId, newLimit) => {
    try {
      const response = await api.put(
        `${API_ENDPOINTS.TOKEN_USAGE.LIMIT}/${tenantId}`,
        { new_limit_millions: parseInt(newLimit) }
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to update token limit for tenant ${tenantId}:`, error);
      throw error;
    }
  }
};

// AI services
export const aiService = {
  chat: async (message, conversationId = null) => {
    try {
      const response = await api.post('/ai-coach/chat', {
        message,
        conversation_id: conversationId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to send chat message:', error);
      throw error;
    }
  },
  
  generateReport: async (reportData) => {
    try {
      const response = await api.post('/report-ai/generate', reportData);
      return response.data;
    } catch (error) {
      console.error('Failed to generate report:', error);
      throw error;
    }
  }
};

// Archive services
export const archiveService = {
  getProjects: async () => {
    try {
      const response = await api.get('/archive/projects');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch archive projects:', error);
      throw error;
    }
  },
  
  uploadDocument: async (projectId, file, metadata = {}) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Add metadata
      Object.keys(metadata).forEach(key => {
        formData.append(key, metadata[key]);
      });
      
      const response = await api.post(`/archive/projects/${projectId}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        // Upload progress tracking
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`Upload progress: ${percentCompleted}%`);
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to upload document:', error);
      throw error;
    }
  }
};

// Generic API helper that other services can use
export const apiHelper = {
  // Safe GET request
  get: async (url, config = {}) => {
    try {
      const response = await api.get(url, config);
      return response.data;
    } catch (error) {
      console.error(`GET ${url} failed:`, error);
      throw error;
    }
  },
  
  // Safe POST request
  post: async (url, data = {}, config = {}) => {
    try {
      const response = await api.post(url, data, config);
      return response.data;
    } catch (error) {
      console.error(`POST ${url} failed:`, error);
      throw error;
    }
  },
  
  // Safe PUT request
  put: async (url, data = {}, config = {}) => {
    try {
      const response = await api.put(url, data, config);
      return response.data;
    } catch (error) {
      console.error(`PUT ${url} failed:`, error);
      throw error;
    }
  },
  
  // Safe DELETE request
  delete: async (url, config = {}) => {
    try {
      const response = await api.delete(url, config);
      return response.data;
    } catch (error) {
      console.error(`DELETE ${url} failed:`, error);
      throw error;
    }
  }
};

// Export the configured axios instance for advanced usage
export { api as axiosInstance };

// Default export
export default api;