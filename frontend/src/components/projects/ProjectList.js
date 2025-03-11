import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import projectService from '../../services/projectService';
import ProjectCard from './ProjectCard';

const ProjectList = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await projectService.getAllProjects();
        setProjects(data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load projects. Please try again later.');
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await projectService.deleteProject(id);
        setProjects(projects.filter((project) => project.id !== id));
      } catch (err) {
        setError('Failed to delete project. Please try again.');
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading projects...</div>;
  }

  return (
    <div className="project-list-container">
      <div className="project-list-header">
        <h2>My Projects</h2>
        <button 
          className="create-project-btn"
          onClick={() => navigate('/projects/create')}
        >
          Create New Project
        </button>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="project-grid">
        {projects.length === 0 ? (
          <div className="no-projects">
            <p>You don't have any projects yet.</p>
            <Link to="/projects/create">Create your first project</Link>
          </div>
        ) : (
          projects.map((project) => (
            <ProjectCard 
              key={project.id} 
              project={project} 
              onDelete={() => handleDelete(project.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default ProjectList;