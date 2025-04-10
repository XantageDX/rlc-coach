import axios from 'axios';

//const API_URL = 'http://98.81.245.4:8000';
const API_URL = 'https://rlc-coach-backend-alb-1332858542.us-east-1.elb.amazonaws.com';

// Create axios instance with auth header
const getAuthHeader = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  return user?.access_token ? { Authorization: `Bearer ${user.access_token}` } : {};
};

// Knowledge Gap Report AI service
const kgReportAiService = {
  // Process a message for KG report writing assistance
  processMessage: async (message, reportId = null, reportContext = null) => {
    try {
      const response = await axios.post(
        `${API_URL}/kg-report-ai/message`,
        { 
          message, 
          report_id: reportId,
          report_context: reportContext
        },
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Error from KG report AI service:', error);
      throw error;
    }
  },
  
  // Evaluate a KG report
  evaluateReport: async (reportData) => {
    try {
      const response = await axios.post(
        `${API_URL}/kg-report-ai/evaluate`,
        { report_data: reportData },
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Error evaluating KG report:', error);
      throw error;
    }
  }
};

export default kgReportAiService;