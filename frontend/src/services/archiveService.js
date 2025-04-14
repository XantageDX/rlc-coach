import axios from 'axios';

const API_URL = 'https://api.rapidlearningcycles.xantage.co';

// Get auth header for requests
const getAuthHeader = () => {
  const user = localStorage.getItem('user');
  
  try {
    const parsedUser = user ? JSON.parse(user) : null;
    
    if (parsedUser && parsedUser.access_token) {
      return { 
        Authorization: `Bearer ${parsedUser.access_token}`,
        'Content-Type': 'application/json'
      };
    }
  } catch (error) {
    console.error('Error parsing user token:', error);
  }
  
  return {};
};

const archiveService = {
  // Existing functions...
  getAllProjects: async () => {
    try {
      const response = await axios.get(`${API_URL}/projects`, {
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
      const response = await axios.post(`${API_URL}/projects`, projectData, {
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
  
  uploadDocument: async (type, projectId, file) => {
    const formData = new FormData();
    formData.append('document', file);

    try {
      const response = await axios.post(
        `${API_URL}/projects/${projectId}/upload`, 
        formData, 
        {
          headers: {
            ...getAuthHeader(),
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  },

  // Add new delete functions
  deleteProject: async (projectId) => {
    try {
      await axios.delete(`${API_URL}/projects/${projectId}`, {
        headers: getAuthHeader()
      });
      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  },

  deleteDocument: async (projectId, documentId) => {
    try {
      await axios.delete(`${API_URL}/projects/${projectId}/documents/${documentId}`, {
        headers: getAuthHeader()
      });
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  },

  searchArchive: async (query, numResults = 5) => {
    try {
      const response = await axios.post(
        `${API_URL}/search`,
        {
          query: query,
          num_results: numResults
        },
        {
          headers: {
            ...getAuthHeader(),
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error searching archive:', error);
      throw error;
    }
  }
};

export default archiveService;