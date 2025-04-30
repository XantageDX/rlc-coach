import axios from 'axios';

// const API_URL = 'https://api.rapidlearningcycles.xantage.co';
const API_URL = 'https://api.spark.rapidlearningcycles.com';

// Get auth header for requests
const getAuthHeader = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  return user?.access_token ? { Authorization: `Bearer ${user.access_token}` } : {};
};

const userAdminService = {
  // Fetch all users
  getAllUsers: async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/users`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },
  
  // Create a new user
  createUser: async (userData) => {
    try {
      const response = await axios.post(`${API_URL}/admin/users`, userData, {
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },
  
  // Update user
  updateUser: async (userId, userData) => {
    try {
      const response = await axios.put(`${API_URL}/admin/users/${userId}`, userData, {
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },
  
  // Delete user
  deleteUser: async (userId) => {
    try {
      const response = await axios.delete(`${API_URL}/admin/users/${userId}`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
};

export default userAdminService;