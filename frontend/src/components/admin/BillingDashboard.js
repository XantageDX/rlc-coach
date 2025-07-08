import React, { useState, useEffect, useCallback } from 'react';
import billingService from '../../services/billingService';

const BillingDashboard = () => {
    // State management
    const [currentMonthData, setCurrentMonthData] = useState(null);
    const [previousMonthData, setPreviousMonthData] = useState(null);
    const [tenantBreakdown, setTenantBreakdown] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(billingService.getCurrentMonth());
    const [exporting, setExporting] = useState(false);

    // Load billing data
    const loadBillingData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Get current month data (uses your existing token usage API)
            const currentData = await billingService.getMonthlyReport(selectedMonth);
            setCurrentMonthData(currentData);

            // For now, we don't have historical data, so we'll simulate comparison
            // In the future, when you implement historical endpoints, this will work automatically
            setPreviousMonthData(null); // No historical data yet

            // Process tenant breakdown
            if (currentData && currentData.tenant_breakdown) {
                setTenantBreakdown(currentData.tenant_breakdown);
            }

        } catch (err) {
            setError(err.message);
            console.error('Error loading billing data:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedMonth]);

    // Load data on component mount and when month changes
    useEffect(() => {
        loadBillingData();
    }, [loadBillingData]);

    // Export handlers
    const handleExportCSV = async () => {
        try {
            setExporting(true);
            await billingService.exportMonthlyCSV(selectedMonth);
        } catch (err) {
            setError('Failed to export CSV');
        } finally {
            setExporting(false);
        }
    };

    const handleExportJSON = async () => {
        try {
            setExporting(true);
            await billingService.exportMonthlyJSON(selectedMonth);
        } catch (err) {
            setError('Failed to export JSON');
        } finally {
            setExporting(false);
        }
    };

    // Calculate summary metrics
    const getSummaryMetrics = () => {
        if (!currentMonthData) return null;

        const totalTenants = tenantBreakdown.length;
        const totalTokens = currentMonthData.total_tokens || 0;
        const totalUsers = tenantBreakdown.reduce((sum, tenant) => sum + (tenant.active_users || 0), 0);

        // For now, no historical comparison since we don't have previous month data
        // In the future, when historical data is available, this will automatically work
        const tokenGrowth = 0; // Will be calculated when historical data is available

        return {
            totalTenants,
            totalTokens,
            totalUsers,
            tokenGrowth
        };
    };

    // Get tenant performance insights
    const getTenantInsights = (tenant) => {
        const totalTokens = tenant.total_tokens || 0;
        const usagePercentage = tenant.usage_percentage || 0;
        const efficiency = totalTokens > 1000000 ? 'High Usage' : totalTokens > 100000 ? 'Active' : 'Low Usage';
        
        // Use actual usage percentage from your data
        const engagementRate = usagePercentage;

        let status = 'Good';
        let statusClass = 'status-good';
        
        if (usagePercentage < 30) {
            status = 'Needs Attention';
            statusClass = 'status-warning';
        } else if (usagePercentage > 70) {
            status = 'High Usage';
            statusClass = 'status-excellent';
        }

        return { efficiency, engagementRate, status, statusClass };
    };

    const summaryMetrics = getSummaryMetrics();

    if (loading) {
        return (
            <div className="billing-dashboard">
                <div className="loading-container">
                    <p>Loading billing data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="billing-dashboard">
                <div className="error-container">
                    <p className="error-message">Error: {error}</p>
                    <button onClick={loadBillingData} className="retry-btn">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="billing-dashboard">
            {/* Header with month selector */}
            <div className="billing-header">
                <div className="header-content">
                    <h3>💰 Monthly Billing Dashboard</h3>
                    <div className="month-selector">
                        <label htmlFor="month-select">Current Data:</label>
                        <select
                            id="month-select"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="month-dropdown"
                        >
                            <option value={billingService.getCurrentMonth()}>
                                {billingService.formatMonthDisplay(billingService.getCurrentMonth())} (Live)
                            </option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Executive Summary Cards */}
            {summaryMetrics && (
                <div className="summary-section">
                    <h4>Business Overview</h4>
                    <div className="summary-grid">
                        <div className="summary-card">
                            <div className="card-header">
                                <span className="card-icon">🏢</span>
                                <span className="card-title">Total Tenants</span>
                            </div>
                            <div className="card-value">{summaryMetrics.totalTenants}</div>
                            <div className="card-subtitle">Active organizations</div>
                        </div>

                        <div className="summary-card">
                            <div className="card-header">
                                <span className="card-icon">👥</span>
                                <span className="card-title">Active Users</span>
                            </div>
                            <div className="card-value">{summaryMetrics.totalUsers}</div>
                            <div className="card-subtitle">Across all tenants</div>
                        </div>

                        <div className="summary-card">
                            <div className="card-header">
                                <span className="card-icon">🔄</span>
                                <span className="card-title">Token Usage</span>
                            </div>
                            <div className="card-value">
                                {billingService.formatTokenCount(summaryMetrics.totalTokens)}
                            </div>
                            <div className="card-subtitle">
                                {summaryMetrics.tokenGrowth > 0 && (
                                    <span className="growth-positive">
                                        ↗️ +{summaryMetrics.tokenGrowth}% vs last month
                                    </span>
                                )}
                                {summaryMetrics.tokenGrowth < 0 && (
                                    <span className="growth-negative">
                                        ↘️ {summaryMetrics.tokenGrowth}% vs last month
                                    </span>
                                )}
                                {summaryMetrics.tokenGrowth === 0 && (
                                    <span className="growth-neutral">
                                        Historical trends coming soon
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tenant Breakdown */}
            <div className="tenants-section">
                <h4>Tenant Usage Breakdown</h4>
                {tenantBreakdown.length === 0 ? (
                    <div className="no-data">
                        <p>No tenant usage data available for this month.</p>
                    </div>
                ) : (
                    <div className="tenants-grid">
                        {tenantBreakdown.map((tenant) => {
                            const insights = getTenantInsights(tenant);
                            const totalTokens = tenant.total_tokens || 0;
                            
                            return (
                                <div key={tenant.tenant_id} className="tenant-card">
                                    <div className="tenant-header">
                                        <h5>{tenant.tenant_name || 'Unknown Tenant'}</h5>
                                        <span className={`status-badge ${insights.statusClass}`}>
                                            {insights.status}
                                        </span>
                                    </div>
                                    
                                    <div className="tenant-stats">
                                        <div className="stat-row">
                                            <span className="stat-label">LLM Tokens:</span>
                                            <span className="stat-value">
                                                {billingService.formatTokenCount(tenant.total_llm_tokens)}
                                            </span>
                                        </div>
                                        
                                        <div className="stat-row">
                                            <span className="stat-label">Embedding Tokens:</span>
                                            <span className="stat-value">
                                                {billingService.formatTokenCount(tenant.total_embedding_tokens)}
                                            </span>
                                        </div>
                                        
                                        <div className="stat-row">
                                            <span className="stat-label">Total Usage:</span>
                                            <span className="stat-value stat-total">
                                                {billingService.formatTokenCount(totalTokens)}
                                            </span>
                                        </div>
                                        
                                        <div className="stat-row">
                                            <span className="stat-label">Usage vs Limit:</span>
                                            <span className="stat-value">
                                                {tenant.usage_percentage}%
                                                ({billingService.formatTokenCount(totalTokens)}/{billingService.formatTokenCount(tenant.token_limit)})
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="tenant-insights">
                                        <span className="insight-badge">
                                            📊 {insights.efficiency}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Export Section */}
            <div className="export-section">
                <h4>Export & Reports</h4>
                <div className="export-controls">
                    <button
                        onClick={handleExportCSV}
                        disabled={exporting}
                        className="export-btn"
                    >
                        {exporting ? 'Exporting...' : '📄 Export CSV'}
                    </button>
                    
                    <button
                        onClick={handleExportJSON}
                        disabled={exporting}
                        className="export-btn"
                    >
                        {exporting ? 'Exporting...' : '📋 Export JSON'}
                    </button>
                    
                    <button
                        onClick={loadBillingData}
                        disabled={loading}
                        className="refresh-btn"
                    >
                        {loading ? 'Refreshing...' : '🔄 Refresh Data'}
                    </button>
                </div>
                
                <div className="export-info">
                    <p>
                        <strong>Data Source:</strong> Live token usage data
                    </p>
                    <p>
                        <strong>Last Updated:</strong> {new Date().toLocaleString()}
                    </p>
                    <p>
                        <strong>Note:</strong> Historical trends and monthly comparisons will be available soon
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BillingDashboard;