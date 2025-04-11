import axios from 'axios';

//const API_URL = 'http://98.81.245.4:8000';
//const API_URL = 'https://rlc-coach-backend-alb-1332858542.us-east-1.elb.amazonaws.com';
const API_URL = 'https://api.rapidlearningcycles.xantage.co';

// Create axios instance with auth header
const getAuthHeader = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  return user?.access_token ? { Authorization: `Bearer ${user.access_token}` } : {};
};

// Integration Event API service
const integrationEventService = {
  // Get all integration events for a project
  getProjectEvents: async (projectId) => {
    try {
      const response = await axios.get(`${API_URL}/projects/${projectId}/integration-events/`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching integration events:', error);
      throw error;
    }
  },

  // Get integration event by ID
  getEventById: async (projectId, eventId) => {
    try {
      const response = await axios.get(`${API_URL}/projects/${projectId}/integration-events/${eventId}`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching integration event ${eventId}:`, error);
      throw error;
    }
  },

  // Create new integration event
  createEvent: async (projectId, eventData) => {
    try {
      const response = await axios.post(`${API_URL}/projects/${projectId}/integration-events/`, eventData, {
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating integration event:', error);
      throw error;
    }
  },

  // Update integration event
  updateEvent: async (projectId, eventId, eventData) => {
    try {
      const response = await axios.put(`${API_URL}/projects/${projectId}/integration-events/${eventId}`, eventData, {
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error updating integration event ${eventId}:`, error);
      throw error;
    }
  },

  // Delete integration event
  deleteEvent: async (projectId, eventId) => {
    try {
      const response = await axios.delete(`${API_URL}/projects/${projectId}/integration-events/${eventId}`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error(`Error deleting integration event ${eventId}:`, error);
      throw error;
    }
  },
  
  // Reorder integration events
  reorderEvents: async (projectId, eventOrder) => {
    try {
      const response = await axios.post(`${API_URL}/projects/${projectId}/integration-events/reorder`, 
        eventOrder, 
        {
          headers: {
            ...getAuthHeader(),
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error reordering integration events:', error);
      throw error;
    }
  }
};

export default integrationEventService;