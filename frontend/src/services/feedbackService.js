import axios from 'axios';

const API_URL = 'https://api.spark.rapidlearningcycles.com';

// Create axios instance with auth header
const getAuthHeader = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  return user?.access_token ? { Authorization: `Bearer ${user.access_token}` } : {};
};

// Feedback API service
const feedbackService = {
  // Submit feedback
  submitFeedback: async (feedbackData) => {
    try {
      const response = await axios.post(
        `${API_URL}/feedback/submit`,
        feedbackData,
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  }
};

export default feedbackService;