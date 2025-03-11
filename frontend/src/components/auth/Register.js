import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password_confirm: '',
  });
  const [errorMessage, setErrorMessage] = useState('');
  const { register, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    
    // Validate passwords match
    if (formData.password !== formData.password_confirm) {
      setErrorMessage('Passwords do not match');
      return;
    }
    
    try {
      // Exclude password_confirm from the data sent to API
      const { password_confirm, ...registerData } = formData;
      await register(registerData);
      navigate('/login'); // Redirect to login after registration
    } catch (err) {
      setErrorMessage(err.message || 'Failed to register');
    }
  };

  return (
    <div className="register-container">
      <div className="register-form">
        <h2>Create Account</h2>
        <form onSubmit={handleSubmit}>
          {errorMessage && <div className="error-message">{errorMessage}</div>}
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="first_name">First Name</label>
            <input
              type="text"
              id="first_name"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="last_name">Last Name</label>
            <input
              type="text"
              id="last_name"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password_confirm">Confirm Password</label>
            <input
              type="password"
              id="password_confirm"
              name="password_confirm"
              value={formData.password_confirm}
              onChange={handleChange}
              required
            />
          </div>
          
          <button type="submit" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
          
          <p>
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;