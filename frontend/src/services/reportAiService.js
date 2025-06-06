import axios from 'axios';

// const API_URL = 'https://api.rapidlearningcycles.xantage.co';
const API_URL = 'https://api.spark.rapidlearningcycles.com';

// Create axios instance with auth header
const getAuthHeader = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  return user?.access_token ? { Authorization: `Bearer ${user.access_token}` } : {};
};

// Report AI service - handles both KG and KD
const reportAiService = {
  processKGMessage: async (message, reportId = null, reportContext = null, modelId = null, sessionId = null) => {
    try {
      const response = await axios.post(
        `${API_URL}/report-ai/message`,
        { 
          message, 
          report_id: reportId,
          report_context: reportContext,
          report_type: 'kg',
          model_id: modelId,
          session_id: sessionId  // Add this parameter
        },
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Error from KG report AI service:', error);
      throw error;
    }
  },
  

  // CLEAR CONVERSATION MEMORY

  clearReportSession: async (reportId = null, reportType = 'kg', sessionId = null) => {
    try {
      const response = await axios.post(
        `${API_URL}/report-ai/clear-session`,
        { 
          report_id: reportId,
          report_type: reportType,
          session_id: sessionId
        },
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Error clearing report session:', error);
      throw error;
    }
  },

  processKDMessage: async (message, reportId = null, reportContext = null, modelId = null, sessionId = null) => {
    try {
      const response = await axios.post(
        `${API_URL}/report-ai/message`,
        { 
          message, 
          report_id: reportId,
          report_context: reportContext,
          report_type: 'kd',
          model_id: modelId,
          session_id: sessionId  // Add this parameter
        },
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Error from KD report AI service:', error);
      throw error;
    }
  },
  
  // Evaluate a KG report
  evaluateKGReport: async (reportData, modelId = null) => {
    try {
      const response = await axios.post(
        `${API_URL}/report-ai/evaluate`,
        { 
          report_data: reportData,
          report_type: 'kg',
          model_id: modelId
        },
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Error evaluating KG report:', error);
      throw error;
    }
  },
  
  // Evaluate a KD report
  evaluateKDReport: async (reportData, modelId = null) => {
    try {
      const response = await axios.post(
        `${API_URL}/report-ai/evaluate`,
        { 
          report_data: reportData,
          report_type: 'kd',
          model_id: modelId
        },
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Error evaluating KD report:', error);
      throw error;
    }
  },

  checkArchive: async (reportData, reportType, modelId = null) => {
    try {
      // Create a query string from the report data
      let queryText = '';
      
      if (reportType === 'kg') {
        queryText = `
          Knowledge Gap: ${reportData.title || ''}
          Question: ${reportData.description || ''}
          Purpose: ${reportData.purpose || ''}
          What We Have Done: ${reportData.what_we_have_done || ''}
          What We Have Learned: ${reportData.what_we_have_learned || ''}
          Recommendations: ${reportData.recommendations || ''}
        `;
      } else if (reportType === 'kd') {
        queryText = `
          Key Decision: ${reportData.title || ''}
          Description: ${reportData.description || ''}
          Purpose: ${reportData.purpose || ''}
          What We Have Done: ${reportData.what_we_have_done || ''}
          What We Have Learned: ${reportData.what_we_have_learned || ''}
          Recommendations: ${reportData.recommendations || ''}
        `;
      }
      
      const response = await axios.post(
        `${API_URL}/report-ai/check-archive`,
        { 
          query: queryText,
          max_results: 5,
          model_id: modelId
        },
        { headers: getAuthHeader() }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error checking archive:', error);
      throw error;
    }
  }
};


export default reportAiService;