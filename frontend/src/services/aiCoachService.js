// aiCoachService.js
import axios from 'axios';

// const API_URL = 'https://api.rapidlearningcycles.xantage.co';
const API_URL = 'https://api.spark.rapidlearningcycles.com';

// Create axios instance with auth header
const getAuthHeader = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  return user?.access_token ? { Authorization: `Bearer ${user.access_token}` } : {};
};

// AI Coach service
const aiCoachService = {
  // Ask a question to the AI Coach
  askQuestion: async (question, conversationId = null, modelId = null) => {
    try {
      const response = await axios.post(
        `${API_URL}/ai-coach/ask`,
        { question, conversation_id: conversationId, model_id: modelId },
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Error asking AI Coach:', error);
      throw error;
    }
  }
};

export default aiCoachService;