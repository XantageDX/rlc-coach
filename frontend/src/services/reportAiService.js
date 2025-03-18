// // reportAiService.js
// import axios from 'axios';

// const API_URL = 'http://localhost:8000';

// // Create axios instance with auth header
// const getAuthHeader = () => {
//   const user = JSON.parse(localStorage.getItem('user'));
//   return user?.access_token ? { Authorization: `Bearer ${user.access_token}` } : {};
// };

// // Report AI service - handles both KG and KD
// const reportAiService = {
//   // Process a message for KG report writing assistance
//   processKGMessage: async (message, reportId = null, reportContext = null) => {
//     try {
//       const response = await axios.post(
//         `${API_URL}/report-ai/message`,
//         { 
//           message, 
//           report_id: reportId,
//           report_context: reportContext,
//           report_type: 'kg'
//         },
//         { headers: getAuthHeader() }
//       );
//       return response.data;
//     } catch (error) {
//       console.error('Error from KG report AI service:', error);
//       throw error;
//     }
//   },
  
//   // Process a message for KD report writing assistance
//   processKDMessage: async (message, reportId = null, reportContext = null) => {
//     try {
//       const response = await axios.post(
//         `${API_URL}/report-ai/message`,
//         { 
//           message, 
//           report_id: reportId,
//           report_context: reportContext,
//           report_type: 'kd'
//         },
//         { headers: getAuthHeader() }
//       );
//       return response.data;
//     } catch (error) {
//       console.error('Error from KD report AI service:', error);
//       throw error;
//     }
//   },
  
//   // Evaluate a KG report
//   evaluateKGReport: async (reportData) => {
//     try {
//       const response = await axios.post(
//         `${API_URL}/report-ai/evaluate`,
//         { 
//           report_data: reportData,
//           report_type: 'kg'
//         },
//         { headers: getAuthHeader() }
//       );
//       return response.data;
//     } catch (error) {
//       console.error('Error evaluating KG report:', error);
//       throw error;
//     }
//   },
  
//   // Evaluate a KD report
//   evaluateKDReport: async (reportData) => {
//     try {
//       const response = await axios.post(
//         `${API_URL}/report-ai/evaluate`,
//         { 
//           report_data: reportData,
//           report_type: 'kd'
//         },
//         { headers: getAuthHeader() }
//       );
//       return response.data;
//     } catch (error) {
//       console.error('Error evaluating KD report:', error);
//       throw error;
//     }
//   }
// };

// export default reportAiService;
// src/services/reportAiService.js
import axios from 'axios';

const API_URL = 'http://localhost:8000';

// Create axios instance with auth header
const getAuthHeader = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  return user?.access_token ? { Authorization: `Bearer ${user.access_token}` } : {};
};

// Report AI service - handles both KG and KD
const reportAiService = {
  // Process a message for KG report writing assistance
  processKGMessage: async (message, reportId = null, reportContext = null) => {
    try {
      const response = await axios.post(
        `${API_URL}/report-ai/message`,
        { 
          message, 
          report_id: reportId,
          report_context: reportContext,
          report_type: 'kg'
        },
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Error from KG report AI service:', error);
      throw error;
    }
  },
  
  // Process a message for KD report writing assistance
  processKDMessage: async (message, reportId = null, reportContext = null) => {
    try {
      const response = await axios.post(
        `${API_URL}/report-ai/message`,
        { 
          message, 
          report_id: reportId,
          report_context: reportContext,
          report_type: 'kd'
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
  evaluateKGReport: async (reportData) => {
    try {
      const response = await axios.post(
        `${API_URL}/report-ai/evaluate`,
        { 
          report_data: reportData,
          report_type: 'kg'
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
  evaluateKDReport: async (reportData) => {
    try {
      const response = await axios.post(
        `${API_URL}/report-ai/evaluate`,
        { 
          report_data: reportData,
          report_type: 'kd'
        },
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Error evaluating KD report:', error);
      throw error;
    }
  }
};

export default reportAiService;