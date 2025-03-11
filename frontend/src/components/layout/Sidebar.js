import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const Sidebar = () => {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [selectedProject, setSelectedProject] = useState('');
  
  // This would be populated from API in the future
  const projects = [
    { id: "1", name: "Project A" },
    { id: "2", name: "Project B" },
    { id: "3", name: "Project C" }
  ];
  
  const handleProjectSelect = (e) => {
    setSelectedProject(e.target.value);
    // In the future, this would update the context or trigger data loading
  };

  return (
    <div className="sidebar">
      <h2>RLC Coach</h2>
      <ul>
        {/* Project-agnostic sections */}
        <li>
          <Link to="/dashboard">Dashboard</Link>
        </li>
        <li>
          <Link to="/ai-coach">AI Coach</Link>
        </li>
        
        {/* Divider and Project Selector */}
        <li className="divider"></li>
        <li className="project-selector">
          <label htmlFor="project-selector">Select Project:</label>
          <select 
            id="project-selector" 
            value={selectedProject}
            onChange={handleProjectSelect}
          >
            <option value="">--Choose a Project--</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </li>
        
        {/* Project-specific sections */}
        <li>
          <Link to="/core-hypothesis">Core Hypothesis Guide</Link>
        </li>
        <li>
          <Link to="/projects">Project Schedule</Link>
        </li>
        <li>
          <Link to="/report-writer">Report Writer</Link>
        </li>
        <li>
          <Link to="/archive">Archive</Link>
        </li>
        
        {/* Divider before Admin sections */}
        <li className="divider"></li>
        
        {/* Admin Sections */}
        <li>
          <Link to="/project-admin">Project Admin</Link>
        </li>
        <li>
          <Link to="/account-admin">Account Admin</Link>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;