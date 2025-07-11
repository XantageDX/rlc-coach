import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import userAdminService from '../../services/userAdminService';
import TenantManagement from './TenantManagement';
import BillingDashboard from './BillingDashboard';
import { 
  authenticatedGet, 
  authenticatedPost, 
  authenticatedPut,
  handleApiError, 
  createAuthStateHandler,
  buildApiUrl,
  API_ENDPOINTS,
  formatTimeUntilExpiration 
} from '../../utils/authUtils';
import './../../styles/user-admin.css';

const UserAdmin = () => {
  const { 
    currentUser, 
    logout, 
    isTokenExpired, 
    validateSession,
    isTokenValid,
    getTokenExpirationTime 
  } = useContext(AuthContext);
  
  const [users, setUsers] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [tokenUsage, setTokenUsage] = useState([]);
  const [activeTab, setActiveTab] = useState('users');
  const [newUser, setNewUser] = useState({
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    role: 'user',
    tenant_id: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [impersonatingTenant, setImpersonatingTenant] = useState(null);

  // Create auth state handler for consistent error handling
  const authHandler = createAuthStateHandler(setError, logout);

  // Check if user is authorized
  const isAuthorized = currentUser?.role === 'super_admin' || currentUser?.role === 'tenant_admin';
  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Validate session on component mount and show session info
  useEffect(() => {
    if (!validateSession()) {
      return; // Session validation will handle logout if needed
    }

    if (isAuthorized) {
      fetchUsers();
      if (isSuperAdmin) {
        fetchTenants();
        fetchTokenUsage();
      }
    }
  }, [isAuthorized, isSuperAdmin]);

  // Enhanced fetch functions with proper error handling
  const fetchUsers = async () => {
    await authHandler.safeApiCall(async () => {
      setLoading(true);
      setError(null);
      
      try {
        const userData = await userAdminService.getAllUsers();
        setUsers(userData);
      } catch (err) {
        // Check if it's an auth error first
        if (!authHandler.handleAuthError(err)) {
          // If not auth error, show generic message
          throw new Error('Failed to fetch users');
        }
      } finally {
        setLoading(false);
      }
    });
  };

  const fetchTenants = async () => {
    await authHandler.safeApiCall(async () => {
      setError(null);
      
      const tenantsData = await authenticatedGet(
        buildApiUrl(API_ENDPOINTS.ADMIN.TENANTS),
        authHandler.handleAuthError
      );
      
      setTenants(tenantsData);
    });
  };

  const fetchTokenUsage = async () => {
    await authHandler.safeApiCall(async () => {
      setError(null);
      
      const usageData = await authenticatedGet(
        buildApiUrl(API_ENDPOINTS.TOKEN_USAGE.ALL),
        authHandler.handleAuthError
      );
      
      setTokenUsage(usageData.tenants || []);
    });
  };

  const refreshTokenUsage = async () => {
    await authHandler.safeApiCall(async () => {
      await authenticatedPost(
        buildApiUrl(API_ENDPOINTS.TOKEN_USAGE.REFRESH),
        {},
        authHandler.handleAuthError
      );
      
      await fetchTokenUsage();
      alert('Usage data refreshed successfully!');
    });
  };

  const updateTokenLimit = async (tenantId, newLimit) => {
    await authHandler.safeApiCall(async () => {
      await authenticatedPut(
        buildApiUrl(`${API_ENDPOINTS.TOKEN_USAGE.LIMIT}/${tenantId}`),
        { new_limit_millions: parseInt(newLimit) },
        authHandler.handleAuthError
      );
      
      alert('Token limit updated successfully!');
      await fetchTokenUsage();
    });
  };

  const impersonateTenant = (tenant) => {
    setImpersonatingTenant(tenant);
    // Here you would implement the actual impersonation logic
    // This might involve updating the user context or making an API call
    alert(`Now viewing as ${tenant.name} (Impersonation feature to be fully implemented)`);
  };

  const stopImpersonation = () => {
    setImpersonatingTenant(null);
    alert('Returned to Super Admin view');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    await authHandler.safeApiCall(async () => {
      await userAdminService.createUser(newUser);
      
      // Reset form and refresh user list
      setNewUser({
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        role: 'user',
        tenant_id: ''
      });
      
      await fetchUsers();
    });
  };

  const handleDeleteUser = async (email) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      await authHandler.safeApiCall(async () => {
        await userAdminService.deleteUser(email);
        await fetchUsers();
      });
    }
  };

  // Session expired state
  if (isTokenExpired) {
    return (
      <div className="user-admin-container">
        <div className="session-expired-message">
          <h2>⚠️ Session Expired</h2>
          <p>Your session has expired. Please log in again to continue.</p>
          <div className="session-expired-actions">
            <button 
              onClick={() => window.location.href = '/login'} 
              className="login-again-btn"
            >
              Log In Again
            </button>
            <button 
              onClick={() => window.location.href = '/'} 
              className="go-home-btn"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check authorization
  if (!isAuthorized) {
    return (
      <div className="user-admin-container">
        <h2>Access Denied</h2>
        <p>You do not have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="user-admin-container">

      {/* Impersonation indicator */}
      {impersonatingTenant && (
        <div className="impersonation-banner">
          <span>You are viewing as {impersonatingTenant.name}</span>
          <button onClick={stopImpersonation} className="stop-impersonation-btn">
            Back to SuperAdmin
          </button>
        </div>
      )}

      {/* Global Error Display */}
      {error && (
        <div className="global-error-message">
          {error}
          <button onClick={() => setError(null)} className="dismiss-error">×</button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          User Management
        </button>
        {isSuperAdmin && (
          <>
            <button 
              className={activeTab === 'tenant-management' ? 'active' : ''}
              onClick={() => setActiveTab('tenant-management')}
            >
              Tenant Management
            </button>
            <button 
              className={activeTab === 'tenants' ? 'active' : ''}
              onClick={() => setActiveTab('tenants')}
            >
              Tenant Impersonation
            </button>
            <button 
              className={activeTab === 'usage' ? 'active' : ''}
              onClick={() => setActiveTab('usage')}
            >
              Token Usage Monitoring
            </button>
            <button 
              className={activeTab === 'billing' ? 'active' : ''}
              onClick={() => setActiveTab('billing')}
            >
              💰 Billing
            </button>
          </>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && (
        <div className="user-admin-layout">
          <div className="user-creation-section">
            <h3>Create User</h3>
            <div className="user-creation-form">
              
              <form onSubmit={handleCreateUser}>
                <div className="form-group">
                  <label htmlFor="new-username">Email</label>
                  <input 
                    type="email" 
                    id="new-username" 
                    name="email"
                    value={newUser.email}
                    onChange={handleInputChange}
                    placeholder="jane.doe@example.com" 
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="new-firstname">First Name</label>
                  <input 
                    type="text" 
                    id="new-firstname" 
                    name="first_name"
                    value={newUser.first_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="new-lastname">Last Name</label>
                  <input 
                    type="text" 
                    id="new-lastname" 
                    name="last_name"
                    value={newUser.last_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="new-password">Password</label>
                  <input 
                    type="password" 
                    id="new-password" 
                    name="password"
                    value={newUser.password}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="user-role">Role</label>
                  <select 
                    id="user-role"
                    name="role"
                    value={newUser.role}
                    onChange={handleInputChange}
                  >
                    <option value="user">User</option>
                    {isSuperAdmin && (
                      <>
                        <option value="tenant_admin">Tenant Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </>
                    )}
                  </select>
                </div>

                {isSuperAdmin && (
                  <div className="form-group">
                    <label htmlFor="tenant-assignment">Assign to Tenant</label>
                    <select 
                      id="tenant-assignment"
                      name="tenant_id"
                      value={newUser.tenant_id}
                      onChange={handleInputChange}
                    >
                      <option value="">No Tenant (Super Admin)</option>
                      {tenants.map(tenant => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                <button type="submit" className="create-user-btn">
                  Create User
                </button>
              </form>
            </div>
          </div>
          
          <div className="users-list-section">
            <h3>Existing Users</h3>
            <div className="users-list">
              {loading ? (
                <p>Loading users...</p>
              ) : (
                users.map((user, index) => (
                  <div key={index} className="user-item">
                    <div className="user-details">
                      <strong>{user.first_name} {user.last_name}</strong>
                      <span>({user.email})</span>
                      <span className="user-role">
                        {user.role === 'super_admin' ? 'Super Admin' : 
                         user.role === 'tenant_admin' ? 'Tenant Admin' : 'User'}
                      </span>
                      {user.tenant_id && (
                        <span className="tenant-info">
                          Tenant: {tenants.find(t => t.id === user.tenant_id)?.name || user.tenant_id}
                        </span>
                      )}
                    </div>
                    <button 
                      className="delete-btn"
                      onClick={() => handleDeleteUser(user.email)}
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tenant Management Tab */}
      {activeTab === 'tenant-management' && isSuperAdmin && (
        <TenantManagement />
      )}

      {/* Tenant Impersonation Tab */}
      {activeTab === 'tenants' && isSuperAdmin && (
        <div className="tenants-section">
          <h3>Tenant Impersonation</h3>
          <p>Click on a tenant to view the application as that tenant:</p>
          <div className="tenants-grid">
            {tenants.map(tenant => (
              <div key={tenant.id} className="tenant-card">
                <h4>{tenant.name}</h4>
                <p>{tenant.email}</p>
                <button 
                  className="impersonate-btn"
                  onClick={() => impersonateTenant(tenant)}
                >
                  View as {tenant.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Token Usage Monitoring Tab */}
      {activeTab === 'usage' && isSuperAdmin && (
        <div className="usage-section">
          <div className="usage-header">
            <h3>Token Usage Monitoring</h3>
            <button onClick={refreshTokenUsage} className="refresh-btn">
              Refresh Usage Data
            </button>
          </div>
          
          <div className="usage-grid">
            {tokenUsage.map(tenantUsage => (
              <div key={tenantUsage.tenant_id} className="usage-card">
                <h4>{tenantUsage.tenant_name}</h4>
                <div className="usage-stats">
                  <div className="usage-item">
                    <span>Total Tokens:</span>
                    <span>{(tenantUsage.usage.total_tokens_used / 1000000).toFixed(1)}M / {(tenantUsage.usage.token_limit / 1000000).toFixed(0)}M</span>
                  </div>
                  <div className="usage-item">
                    <span>LLM Tokens:</span>
                    <span>{(tenantUsage.usage.llm_tokens_used / 1000000).toFixed(1)}M</span>
                  </div>
                  <div className="usage-item">
                    <span>Embedding Tokens:</span>
                    <span>{(tenantUsage.usage.embedding_tokens_used / 1000000).toFixed(1)}M</span>
                  </div>
                  <div className="usage-item">
                    <span>Usage:</span>
                    <span>{tenantUsage.usage.usage_percentage}%</span>
                  </div>
                </div>
                
                <div className="usage-progress">
                  <div 
                    className="progress-bar"
                    style={{
                      width: `${Math.min(tenantUsage.usage.usage_percentage, 100)}%`,
                      backgroundColor: tenantUsage.usage.usage_percentage > 75 ? '#ff4444' : '#4caf50'
                    }}
                  ></div>
                </div>
                
                <div className="token-limit-control">
                  <label>Token Limit (Millions):</label>
                  <input 
                    type="number" 
                    defaultValue={tenantUsage.usage.token_limit / 1000000}
                    onBlur={(e) => {
                      const newLimit = e.target.value;
                      if (newLimit !== (tenantUsage.usage.token_limit / 1000000).toString()) {
                        updateTokenLimit(tenantUsage.tenant_id, newLimit);
                      }
                    }}
                    min="1"
                    max="1000"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Billing Dashboard Tab */}
      {activeTab === 'billing' && isSuperAdmin && (
        <BillingDashboard />
      )}
    </div>
  );
};

export default UserAdmin;