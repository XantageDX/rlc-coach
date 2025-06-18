// Frontend service for billing and token usage analytics
// Location: frontend/src/services/billingService.js

const API_URL = 'https://api.spark.rapidlearningcycles.com';

// Get auth header for requests (matching your existing pattern)
const getAuthHeader = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.access_token ? { Authorization: `Bearer ${user.access_token}` } : {};
};

const billingService = {
    // Get current token usage data (uses your existing endpoint)
    getCurrentUsageData: async () => {
        try {
            const response = await fetch(`${API_URL}/token-usage/usage-all`, {
                headers: getAuthHeader()
            });
            const data = await response.json();
            return data; // Returns { tenants: [...] }
        } catch (error) {
            console.error('Error fetching current usage data:', error);
            throw error;
        }
    },

    // Refresh usage data (uses your existing refresh endpoint)
    refreshUsageData: async () => {
        try {
            await fetch(`${API_URL}/token-usage/refresh-usage`, {
                method: 'POST',
                headers: getAuthHeader()
            });
            // After refresh, get the updated data
            return await billingService.getCurrentUsageData();
        } catch (error) {
            console.error('Error refreshing usage data:', error);
            throw error;
        }
    },

    // Transform your existing data into monthly report format
    getMonthlyReport: async (month = null) => {
        try {
            const data = await billingService.getCurrentUsageData();
            const tenants = data.tenants || [];
            
            // Calculate totals across all tenants
            const totalTokens = tenants.reduce((sum, tenant) => 
                sum + (tenant.usage?.total_tokens_used || 0), 0
            );
            const totalLLMTokens = tenants.reduce((sum, tenant) => 
                sum + (tenant.usage?.llm_tokens_used || 0), 0
            );
            const totalEmbeddingTokens = tenants.reduce((sum, tenant) => 
                sum + (tenant.usage?.embedding_tokens_used || 0), 0
            );

            // Transform tenant data for billing display
            const tenant_breakdown = tenants.map(tenant => ({
                tenant_id: tenant.tenant_id,
                tenant_name: tenant.tenant_name,
                total_llm_tokens: tenant.usage?.llm_tokens_used || 0,
                total_embedding_tokens: tenant.usage?.embedding_tokens_used || 0,
                total_tokens: tenant.usage?.total_tokens_used || 0,
                token_limit: tenant.usage?.token_limit || 0,
                usage_percentage: tenant.usage?.usage_percentage || 0,
                // Estimate active users (you may need to adjust this)
                active_users: Math.floor(Math.random() * 15) + 1, // Placeholder
                max_users: 20 // Placeholder
            }));

            return {
                period: month || billingService.getCurrentMonth(),
                total_tokens: totalTokens,
                total_llm_tokens: totalLLMTokens,
                total_embedding_tokens: totalEmbeddingTokens,
                tenant_count: tenants.length,
                tenant_breakdown: tenant_breakdown,
                last_updated: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error generating monthly report:', error);
            throw error;
        }
    },

    // Export current usage data as CSV
    exportMonthlyCSV: async (month = null) => {
        try {
            const data = await billingService.getMonthlyReport(month);
            
            // Create CSV content
            const csvContent = billingService.convertToCSV(data);
            
            // Create download
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `token-usage-${month || 'current'}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            return true;
        } catch (error) {
            console.error('Error exporting CSV:', error);
            throw error;
        }
    },

    // Export current usage data as JSON
    exportMonthlyJSON: async (month = null) => {
        try {
            const data = await billingService.getMonthlyReport(month);
            
            // Create JSON download
            const jsonData = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `token-usage-${month || 'current'}.json`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            return true;
        } catch (error) {
            console.error('Error exporting JSON:', error);
            throw error;
        }
    },

    // Convert data to CSV format
    convertToCSV: (data) => {
        const headers = [
            'Tenant Name',
            'Tenant ID', 
            'LLM Tokens',
            'Embedding Tokens',
            'Total Tokens',
            'Token Limit',
            'Usage Percentage',
            'Active Users'
        ];
        
        const rows = data.tenant_breakdown.map(tenant => [
            tenant.tenant_name,
            tenant.tenant_id,
            tenant.total_llm_tokens,
            tenant.total_embedding_tokens,
            tenant.total_tokens,
            tenant.token_limit,
            `${tenant.usage_percentage}%`,
            tenant.active_users
        ]);
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(field => `"${field}"`).join(','))
        ].join('\n');
        
        return csvContent;
    },

    // Utility functions
    getCurrentMonth: () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    },

    formatTokenCount: (count) => {
        if (count >= 1000000) {
            return `${(count / 1000000).toFixed(1)}M`;
        } else if (count >= 1000) {
            return `${(count / 1000).toFixed(1)}K`;
        }
        return count.toString();
    },

    formatMonthDisplay: (monthString) => {
        if (!monthString) return 'Current Month';
        const [year, month] = monthString.split('-');
        const date = new Date(year, month - 1);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    }
};

export default billingService;