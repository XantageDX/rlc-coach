import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const Dashboard = () => {
  const { currentUser } = useContext(AuthContext);

  return (
    <div className="dashboard">
      <div className="dashboard-content">
        <h1>Dashboard</h1>
        <p>Welcome, {currentUser.first_name} {currentUser.last_name}!</p>
        
        <div className="dashboard-cards">
          <div className="dashboard-card">
            <h2>Projects</h2>
            <p>Manage your RLC projects</p>
            <Link to="/projects" className="card-link">View Projects</Link>
          </div>
          
          <div className="dashboard-card">
            <h2>Key Decisions</h2>
            <p>Track key decisions for your projects</p>
            <Link to="/projects" className="card-link">View Projects</Link>
          </div>
          
          <div className="dashboard-card">
            <h2>Knowledge Gaps</h2>
            <p>Manage knowledge gaps in your projects</p>
            <Link to="/projects" className="card-link">View Projects</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;