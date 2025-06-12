// Frontend service for tenant management API calls
// Location: frontend/src/services/tenantService.js

import axios from 'axios';

const API_URL = 'https://api.spark.rapidlearningcycles.com';

// Get auth header for requests
const getAuthHeader = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.access_token ? { Authorization: `Bearer ${user.access_token}` } : {};
};

const tenantService = {
    // Create new tenant with AWS account
    createTenant: async (tenantData) => {
        try {
            const response = await axios.post(`${API_URL}/tenants/create`, {
                name: tenantData.name,
                email: tenantData.email,
                description: tenantData.description || ''
            }, {
                headers: {
                    ...getAuthHeader(),
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('Create tenant error:', error);
            throw error;
        }
    },

    // Get list of all tenants
    getTenantList: async () => {
        try {
            const response = await axios.get(`${API_URL}/tenants/list`, {
                headers: getAuthHeader()
            });
            return response.data;
        } catch (error) {
            console.error('Get tenant list error:', error);
            throw error;
        }
    },

    // Get specific tenant status
    getTenantStatus: async (tenantId) => {
        try {
            const response = await axios.get(`${API_URL}/tenants/${tenantId}/status`, {
                headers: getAuthHeader()
            });
            return response.data;
        } catch (error) {
            console.error('Get tenant status error:', error);
            throw error;
        }
    },

    // Get detailed tenant information
    getTenantDetails: async (tenantId) => {
        try {
            const response = await axios.get(`${API_URL}/tenants/${tenantId}/details`, {
                headers: getAuthHeader()
            });
            return response.data;
        } catch (error) {
            console.error('Get tenant details error:', error);
            throw error;
        }
    },

    // Retry failed tenant creation
    retryTenantCreation: async (tenantId) => {
        try {
            const response = await axios.post(`${API_URL}/tenants/${tenantId}/retry`, {}, {
                headers: {
                    ...getAuthHeader(),
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('Retry tenant creation error:', error);
            throw error;
        }
    },

    // Status polling utility - polls every 30 seconds until status changes
    pollTenantStatus: async (tenantId, onStatusUpdate, maxPolls = 40) => {
        let pollCount = 0;
        let previousStatus = null;

        const poll = async () => {
            try {
                const statusData = await tenantService.getTenantStatus(tenantId);
                const currentStatus = statusData.status;

                // Call update callback if status changed
                if (currentStatus !== previousStatus) {
                    onStatusUpdate(statusData);
                    previousStatus = currentStatus;
                }

                // Stop polling if status is final or max polls reached
                if (currentStatus === 'READY' || currentStatus === 'FAILED' || pollCount >= maxPolls) {
                    return;
                }

                pollCount++;
                // Poll again in 30 seconds
                setTimeout(poll, 30000);
            } catch (error) {
                console.error('Status polling error:', error);
                // Continue polling despite errors
                if (pollCount < maxPolls) {
                    setTimeout(poll, 30000);
                }
            }
        };

        // Start polling
        poll();
    }
};

// Export the service object
export default tenantService;