import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import projectService from '../../services/projectService';
import logo from '../../assets/powered_by_xantage.png';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedProject, setSelectedProject] = useState('');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Toggle sidebar function
  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };
  
  // Fetch projects when component mounts
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await projectService.getAllProjects();
        setProjects(data);
        
        // If there are projects but none selected, select the first one
        if (data.length > 0 && !selectedProject) {
          // Check localStorage first
          const savedProjectId = localStorage.getItem('selectedProjectId');
          if (savedProjectId && data.some(p => p.id === savedProjectId)) {
            setSelectedProject(savedProjectId);
          } else {
            setSelectedProject(data[0].id);
            localStorage.setItem('selectedProjectId', data[0].id);
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching projects:', err);
        setLoading(false);
      }
    };

    fetchProjects();
  }, [selectedProject]);
  
  const handleProjectSelect = (e) => {
    const projectId = e.target.value;
    setSelectedProject(projectId);
    localStorage.setItem('selectedProjectId', projectId);
    
    // If user is on a project-specific page, redirect to the same page but for the newly selected project
    if (location.pathname.includes('/core-hypothesis') ||
        location.pathname.includes('/projects/') ||
        location.pathname.includes('/report-writer')) {
      // Navigate to the same section but for the new project
      if (location.pathname.includes('/core-hypothesis')) {
        navigate(`/core-hypothesis/${projectId}`);
      } else if (location.pathname.includes('/report-writer')) {
        navigate(`/report-writer/${projectId}`);
      } else {
        navigate(`/projects/${projectId}`);
      }
    }
  };

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Sidebar toggle button */}
      <button 
        className="sidebar-toggle" 
        onClick={toggleSidebar}
        aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? '»' : '«'}
      </button>

      <h2>RLC Coach</h2>
      <ul>
        {/* Project-agnostic sections */}
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
            disabled={loading || projects.length === 0}
          >
            {loading ? (
              <option value="">Loading projects...</option>
            ) : projects.length === 0 ? (
              <option value="">No projects available</option>
            ) : (
              <>
                <option value="">--Choose a Project--</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </>
            )}
          </select>
        </li>
        
        {/* Project-specific sections */}
        <li>
          <Link 
            to={selectedProject ? `/core-hypothesis/${selectedProject}` : "/projects"}
            className={!selectedProject ? "disabled-link" : ""}
            onClick={e => !selectedProject && e.preventDefault()}
          >
            Core Hypothesis Guide
          </Link>
        </li>
        <li>
          <Link 
            to={selectedProject ? `/projects/${selectedProject}/board` : "/projects"}
            className={!selectedProject ? "disabled-link" : ""}
            onClick={e => !selectedProject && e.preventDefault()}
          >
            Project Schedule
          </Link>
        </li>
        <li>
          <Link 
            to={selectedProject ? `/report-writer/${selectedProject}` : "/projects"}
            className={!selectedProject ? "disabled-link" : ""}
            onClick={e => !selectedProject && e.preventDefault()}
          >
            Report Writer
          </Link>
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
      {/* Logo at the bottom of sidebar */}
      <div className="sidebar-logo">
        <img src={logo} alt="Xantage logo" />
      </div>
    </div>
  );
};

export default Sidebar;