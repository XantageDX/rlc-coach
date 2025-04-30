import axios from 'axios';

// const API_URL = 'https://api.rapidlearningcycles.xantage.co';
const API_URL = 'https://api.spark.rapidlearningcycles.com';

// Create axios instance with auth header
const getAuthHeader = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  return user?.access_token ? { Authorization: `Bearer ${user.access_token}` } : {};
};

// Project API service
const projectService = {
  // Get all projects
  getAllProjects: async () => {
    try {
      const response = await axios.get(`${API_URL}/projects/`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  },

  // Get project by ID
  getProjectById: async (id) => {
    try {
      const response = await axios.get(`${API_URL}/projects/${id}`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching project ${id}:`, error);
      throw error;
    }
  },

  // Create new project
  createProject: async (projectData) => {
    try {
      const response = await axios.post(`${API_URL}/projects/`, projectData, {
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  },

  // Update project
  updateProject: async (id, projectData) => {
    try {
      const response = await axios.put(`${API_URL}/projects/${id}`, projectData, {
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error updating project ${id}:`, error);
      throw error;
    }
  },

  // Delete project
  deleteProject: async (id) => {
    try {
      const response = await axios.delete(`${API_URL}/projects/${id}`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error(`Error deleting project ${id}:`, error);
      throw error;
    }
  }
};

export default projectService;