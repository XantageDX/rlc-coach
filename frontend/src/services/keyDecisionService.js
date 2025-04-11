import axios from 'axios';

//const API_URL = 'http://98.81.245.4:8000';
//const API_URL = 'https://rlc-coach-backend-alb-1332858542.us-east-1.elb.amazonaws.com';
const API_URL = 'https://api.rapidlearningcycles.xantage.co';

// Create axios instance with auth header
const getAuthHeader = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  return user?.access_token ? { Authorization: `Bearer ${user.access_token}` } : {};
};

// Key Decision API service
const keyDecisionService = {
  // Get all key decisions for a project
  getProjectKeyDecisions: async (projectId, integrationEventId = null) => {
    try {
      let url = `${API_URL}/projects/${projectId}/key-decisions/`;
      if (integrationEventId) {
        url += `?integration_event_id=${integrationEventId}`;
      }
      
      const response = await axios.get(url, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching key decisions:', error);
      throw error;
    }
  },

  // Get key decision by ID
  getKeyDecisionById: async (projectId, decisionId) => {
    try {
      const response = await axios.get(`${API_URL}/projects/${projectId}/key-decisions/${decisionId}`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching key decision ${decisionId}:`, error);
      throw error;
    }
  },

  // Create new key decision
  createKeyDecision: async (projectId, decisionData) => {
    try {
      console.log('Creating key decision with data:', decisionData);
      console.log('Project ID:', projectId);
      
      const response = await axios.post(`${API_URL}/projects/${projectId}/key-decisions/`, decisionData, {
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating key decision:', error);
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      throw error;
    }
  },

  // Update key decision
  updateKeyDecision: async (projectId, decisionId, decisionData) => {
    try {
      const response = await axios.put(`${API_URL}/projects/${projectId}/key-decisions/${decisionId}`, decisionData, {
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error updating key decision ${decisionId}:`, error);
      throw error;
    }
  },

  // Delete key decision
  deleteKeyDecision: async (projectId, decisionId) => {
    try {
      const response = await axios.delete(`${API_URL}/projects/${projectId}/key-decisions/${decisionId}`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error(`Error deleting key decision ${decisionId}:`, error);
      throw error;
    }
  }
};

export default keyDecisionService;