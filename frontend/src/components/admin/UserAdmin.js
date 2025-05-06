import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import userAdminService from '../../services/userAdminService';
import './../../styles/user-admin.css';

const UserAdmin = () => {
  const { currentUser } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    role: 'standard'  // Default to standard user
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const userData = await userAdminService.getAllUsers();
      setUsers(userData);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch users');
      setLoading(false);
    }
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
    try {
      await userAdminService.createUser(newUser);
      // Reset form and refresh user list
      setNewUser({
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        role: 'viewer'
      });
      fetchUsers();
    } catch (err) {
      setError('Failed to create user');
    }
  };

  const handleDeleteUser = async (email) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await userAdminService.deleteUser(email);
        fetchUsers();
      } catch (err) {
        setError('Failed to delete user');
      }
    }
  };

  // Check if current user is an account admin
  if (currentUser?.role !== 'account_admin') {
    return (
      <div className="user-admin-container">
        <h2>Access Denied</h2>
        <p>You do not have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="user-admin-container">
      {/* <h2>User Administration</h2> */}
      <div className="user-admin-layout">
        <div className="user-creation-section">
          <h3>Create User</h3>
          <div className="user-creation-form">
            {error && <div className="error-message">{error}</div>}
            
            <div className="form-group">
              <label htmlFor="new-username">Email</label>
              <input 
                type="email" 
                id="new-username" 
                name="email"
                value={newUser.email}
                onChange={handleInputChange}
                placeholder="jane.doe@example.com" 
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
                <option value="standard">Standard User</option>
                <option value="account_admin">Account Admin</option>
              </select>
            </div>
            
            <button 
              className="create-user-btn"
              onClick={handleCreateUser}
            >
              Create User
            </button>
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
                      {user.role === 'account_admin' ? 'Account Admin' : 'Standard User'}
                    </span>
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
    </div>
  );
};

export default UserAdmin;