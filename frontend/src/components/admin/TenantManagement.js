import React, { useState, useEffect, useCallback } from 'react';
import tenantService from '../../services/tenantService';

const TenantManagement = () => {
    // State management
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        description: ''
    });
    const [submitting, setSubmitting] = useState(false);

    // Status badge styling helper
    const getStatusBadge = (status) => {
        switch (status) {
            case 'CREATING':
                return 'status-creating';
            case 'SETTING_UP':
                return 'status-setting-up';
            case 'READY':
                return 'status-ready';
            case 'FAILED':
                return 'status-failed';
            default:
                return 'status-unknown';
        }
    };

    // Status display text
    const getStatusText = (status) => {
        switch (status) {
            case 'CREATING':
                return 'Creating AWS Account...';
            case 'SETTING_UP':
                return 'Setting Up Resources...';
            case 'READY':
                return 'Ready';
            case 'FAILED':
                return 'Failed';
            default:
                return status || 'Unknown';
        }
    };

    // Load tenant list
    const loadTenants = useCallback(async () => {
        try {
            setError(null);
            const tenantList = await tenantService.getTenantList();
            setTenants(tenantList);
        } catch (err) {
            setError(err.message);
            console.error('Error loading tenants:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        loadTenants();

        // Set up auto-refresh
        const interval = setInterval(() => {
            loadTenants();
        }, 30000); // 30 seconds

        // Cleanup on unmount
        return () => {
            clearInterval(interval);
        };
    }, [loadTenants]);

    // Handle form input changes
    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Submit new tenant form
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            // Validate form
            if (!formData.name.trim() || !formData.email.trim()) {
                throw new Error('Name and email are required');
            }

            // Create tenant
            const newTenant = await tenantService.createTenant(formData);
            
            // Reset form and close
            setFormData({ name: '', email: '', description: '' });
            setShowCreateForm(false);
            
            // Refresh tenant list
            await loadTenants();
            
            // Start polling for the new tenant's status
            tenantService.pollTenantStatus(
                newTenant._id,
                (statusData) => {
                    // Update the specific tenant in our list
                    setTenants(prev => prev.map(tenant => 
                        tenant._id === newTenant._id 
                            ? { ...tenant, ...statusData }
                            : tenant
                    ));
                }
            );

        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // Retry failed tenant creation
    const handleRetry = async (tenantId) => {
        try {
            setError(null);
            await tenantService.retryTenantCreation(tenantId);
            
            // Refresh tenant list
            await loadTenants();
            
            // Start polling for status updates
            tenantService.pollTenantStatus(
                tenantId,
                (statusData) => {
                    setTenants(prev => prev.map(tenant => 
                        tenant._id === tenantId 
                            ? { ...tenant, ...statusData }
                            : tenant
                    ));
                }
            );
        } catch (err) {
            setError(err.message);
        }
    };

    // Format date display
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString();
    };

    if (loading) {
        return (
            <div className="loading-container">
                <p>Loading tenants...</p>
            </div>
        );
    }

    return (
        <div className="tenant-management-section">
            {/* Error Display */}
            {error && <div className="error-message">{error}</div>}

            {/* Create Tenant Section */}
            <div className="tenant-creation-section">
                <div className="section-header">
                    <h3>Create New Tenant</h3>
                    <button
                        onClick={() => setShowCreateForm(!showCreateForm)}
                        className="toggle-form-btn"
                    >
                        {showCreateForm ? 'Cancel' : 'Create New Tenant'}
                    </button>
                </div>

                {showCreateForm && (
                    <div className="tenant-creation-form">
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="tenant-name">Company Name *</label>
                                <input
                                    type="text"
                                    id="tenant-name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleFormChange}
                                    placeholder="e.g., Test Corporation"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="tenant-email">Admin Email *</label>
                                <input
                                    type="email"
                                    id="tenant-email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleFormChange}
                                    placeholder="admin@company.com"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="tenant-description">Description</label>
                                <textarea
                                    id="tenant-description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleFormChange}
                                    placeholder="Optional description"
                                    rows={3}
                                />
                            </div>

                            <button 
                                type="submit" 
                                className="create-tenant-btn"
                                disabled={submitting}
                            >
                                {submitting ? 'Creating...' : 'Create Tenant'}
                            </button>
                        </form>
                    </div>
                )}
            </div>

            {/* Tenants List Section */}
            <div className="tenants-list-section">
                <div className="section-header">
                    <h3>All Tenants ({tenants.length})</h3>
                    <button onClick={loadTenants} className="refresh-btn">
                        Refresh
                    </button>
                </div>

                <div className="tenants-table-container">
                    <table className="tenants-table">
                        <thead>
                            <tr>
                                <th>Tenant</th>
                                <th>Status</th>
                                <th>AWS Account</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tenants.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="no-data">
                                        No tenants found. Create your first tenant to get started.
                                    </td>
                                </tr>
                            ) : (
                                tenants.map((tenant) => (
                                    <tr key={tenant._id}>
                                        <td>
                                            <div className="tenant-info">
                                                <strong>{tenant.name}</strong>
                                                <span className="tenant-email">{tenant.email}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${getStatusBadge(tenant.status)}`}>
                                                {getStatusText(tenant.status)}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="aws-info">
                                                <div>{tenant.aws_account_id || 'Pending...'}</div>
                                                <small>{tenant.aws_account_email || 'N/A'}</small>
                                            </div>
                                        </td>
                                        <td>{formatDate(tenant.created_at)}</td>
                                        <td>
                                            {tenant.status === 'FAILED' && (
                                                <button
                                                    onClick={() => handleRetry(tenant._id)}
                                                    className="retry-btn"
                                                >
                                                    Retry
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Auto-refresh indicator */}
                <div className="auto-refresh-indicator">
                    Auto-refreshing every 30 seconds. Last updated: {new Date().toLocaleTimeString()}
                </div>
            </div>
        </div>
    );
};

export default TenantManagement;