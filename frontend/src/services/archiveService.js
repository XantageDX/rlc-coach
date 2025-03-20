// frontend/src/services/archiveService.js
import axios from 'axios';

const API_URL = 'http://localhost:8000';

// Get auth header for requests
const getAuthHeader = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  console.log('User from localStorage:', user ? 'User found' : 'No user found');
  if (user && user.access_token) {
    console.log('Token found in user object');
    return { Authorization: `Bearer ${user.access_token}` };
  } else {
    console.log('No token found in user object');
    return {};
  }
};

const archiveService = {
  // Projects
  getAllProjects: async () => {
    try {
      const response = await axios.get(`${API_URL}/archive/projects`, {
        headers: {
          ...getAuthHeader(),
          'Accept': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  },
  
  createProject: async (projectData) => {
    try {
      console.log('Creating project with data:', projectData);
      console.log('Auth headers:', getAuthHeader());
      
      const response = await axios.post(`${API_URL}/archive/projects`, projectData, {
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Project creation successful, response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating project:', error);
      
      // Log more detailed error information
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received, request:', error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error message:', error.message);
      }
      
      throw error;
    }
  },
  
  deleteProject: async (projectId) => {
    try {
      await axios.delete(`${API_URL}/archive/projects/${projectId}`, {
        headers: getAuthHeader()
      });
      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  },
  
  // Key Decisions
  createKeyDecision: async (projectId, kdData) => {
    try {
      const response = await axios.post(`${API_URL}/archive/projects/${projectId}/key-decisions`, kdData, {
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating key decision:', error);
      throw error;
    }
  },
  
  deleteKeyDecision: async (kdId) => {
    try {
      await axios.delete(`${API_URL}/archive/key-decisions/${kdId}`, {
        headers: getAuthHeader()
      });
      return true;
    } catch (error) {
      console.error('Error deleting key decision:', error);
      throw error;
    }
  },
  
  // Knowledge Gaps
  createKnowledgeGap: async (kdId, kgData) => {
    try {
      const response = await axios.post(`${API_URL}/archive/key-decisions/${kdId}/knowledge-gaps`, kgData, {
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating knowledge gap:', error);
      throw error;
    }
  },
  
  deleteKnowledgeGap: async (kgId) => {
    try {
      await axios.delete(`${API_URL}/archive/knowledge-gaps/${kgId}`, {
        headers: getAuthHeader()
      });
      return true;
    } catch (error) {
      console.error('Error deleting knowledge gap:', error);
      throw error;
    }
  },
  
  // Document management (placeholder for future implementation)
  uploadDocument: async (type, id, file) => {
    const formData = new FormData();
    formData.append('document', file);
    try {
      const response = await axios.post(`${API_URL}/archive/${type}/${id}/upload`, formData, {
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  }
};

export default archiveService;