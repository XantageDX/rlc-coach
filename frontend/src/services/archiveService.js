// import axios from 'axios';

// const API_URL = 'http://localhost:8000/archive';

// // Get auth header for requests
// const getAuthHeader = () => {
//   const user = JSON.parse(localStorage.getItem('user'));
//   return user?.access_token ? { Authorization: `Bearer ${user.access_token}` } : {};
// };

// const archiveService = {
//   // Fetch all projects
//   getAllProjects: async () => {
//     try {
//       const response = await axios.get(`${API_URL}/projects`, {
//         headers: {
//           ...getAuthHeader(),
//           'Accept': 'application/json'
//         }
//       });
//       return response.data;
//     } catch (error) {
//       console.error('Error fetching projects:', error);
//       throw error;
//     }
//   },
  
//   // Create a new project
//   createProject: async (projectData) => {
//     try {
//       const response = await axios.post(`${API_URL}/projects`, projectData, {
//         headers: {
//           ...getAuthHeader(),
//           'Content-Type': 'application/json'
//         }
//       });
//       return response.data;
//     } catch (error) {
//       console.error('Error creating project:', error);
//       throw error;
//     }
//   },
  
//   // Upload document to a project
//   uploadDocument: async (type, projectId, file) => {
//     const formData = new FormData();
//     formData.append('document', file);

//     try {
//       const response = await axios.post(
//         `${API_URL}/projects/${projectId}/upload`, 
//         formData, 
//         {
//           headers: {
//             ...getAuthHeader(),
//             'Content-Type': 'multipart/form-data'
//           }
//         }
//       );
//       return response.data;
//     } catch (error) {
//       console.error('Error uploading document:', error);
//       throw error;
//     }
//   },

//   // Delete a project
//   deleteProject: async (projectId) => {
//     try {
//       await axios.delete(`${API_URL}/projects/${projectId}`, {
//         headers: getAuthHeader()
//       });
//       return true;
//     } catch (error) {
//       console.error('Error deleting project:', error);
//       throw error;
//     }
//   }
// };

// export default archiveService;
import axios from 'axios';

const API_URL = 'http://localhost:8000/archive';

// Get auth header for requests
const getAuthHeader = () => {
  // Check for token in localStorage
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
  // Fetch all projects
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
  
  // Create a new project
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
  
  // Upload document to a project
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

  // Delete a project
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
  }
};

export default archiveService;