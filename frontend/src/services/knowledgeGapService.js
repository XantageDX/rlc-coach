import axios from 'axios';

const API_URL = 'http://98.81.245.4:8000';

// Create axios instance with auth header
const getAuthHeader = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  return user?.access_token ? { Authorization: `Bearer ${user.access_token}` } : {};
};

// Knowledge Gap API service
const knowledgeGapService = {
  // Get all knowledge gaps for a project
  getProjectKnowledgeGaps: async (projectId, keyDecisionId = null) => {
    try {
      let url = `${API_URL}/projects/${projectId}/knowledge-gaps/`;
      if (keyDecisionId) {
        url += `?key_decision_id=${keyDecisionId}`;
      }
      
      const response = await axios.get(url, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching knowledge gaps:', error);
      throw error;
    }
  },

  // Get knowledge gap by ID
  getKnowledgeGapById: async (projectId, gapId) => {
    try {
      const response = await axios.get(`${API_URL}/projects/${projectId}/knowledge-gaps/${gapId}`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching knowledge gap ${gapId}:`, error);
      throw error;
    }
  },

  // Create new knowledge gap
  createKnowledgeGap: async (projectId, gapData) => {
    try {
      const response = await axios.post(`${API_URL}/projects/${projectId}/knowledge-gaps/`, gapData, {
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

  // Update knowledge gap
  updateKnowledgeGap: async (projectId, gapId, gapData) => {
    try {
      const response = await axios.put(`${API_URL}/projects/${projectId}/knowledge-gaps/${gapId}`, gapData, {
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error updating knowledge gap ${gapId}:`, error);
      throw error;
    }
  },

  // Delete knowledge gap
  deleteKnowledgeGap: async (projectId, gapId) => {
    try {
      const response = await axios.delete(`${API_URL}/projects/${projectId}/knowledge-gaps/${gapId}`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error(`Error deleting knowledge gap ${gapId}:`, error);
      throw error;
    }
  }
};

export default knowledgeGapService;