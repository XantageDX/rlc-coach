import axios from 'axios';

//const API_URL = 'http://98.81.245.4:8000';
const API_URL = 'https://rlc-coach-backend-alb-1332858542.us-east-1.elb.amazonaws.com';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
});

// Add request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth services
export const authService = {
  login: async (username, password) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    const response = await api.post('/token', formData);
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('token');
  },
};

// Example of a service for projects
export const projectService = {
  getAllProjects: async () => {
    const response = await api.get('/projects');
    return response.data;
  },
  // Add more project methods as needed
};

export default api;