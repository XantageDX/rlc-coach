import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import projectService from '../../services/projectService';

const ProjectAdmin = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // New project form state
  const [newProject, setNewProject] = useState({
    title: '',
    description: ''
  });
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await projectService.getAllProjects();
        setProjects(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching projects:', err);
        setError('Failed to load projects. Please try again later.');
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);
  
  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewProject(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle project creation
  const handleCreateProject = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const created = await projectService.createProject(newProject);
      setProjects(prev => [...prev, created]);
      setNewProject({ title: '', description: '' });
      setShowForm(false);
      setCreating(false);
    } catch (err) {
      console.error('Error creating project:', err);
      setError('Failed to create project. Please try again.');
      setCreating(false);
    }
  };

  // Project Deletion
  const handleDeleteProject = async (projectId) => {
    if (window.confirm("Are you sure you want to delete this project? This will also delete all related Integration Events, Key Decisions, and Knowledge Gaps.")) {
      try {
        await projectService.deleteProject(projectId);
        
        // Update the projects list by removing the deleted project
        setProjects(prevProjects => prevProjects.filter(project => project.id !== projectId));
        
        // Optional: Show success message
        // You could add a success state to display a confirmation
      } catch (err) {
        console.error('Error deleting project:', err);
        setError('Failed to delete project. Please try again.');
      }
    }
  };
  
  return (
    <div className="project-admin-container">
      <h2>Project Administration</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="project-admin-actions">
        <button 
          className="create-project-btn"
          onClick={() => setShowForm(true)}
        >
          Create New Project
        </button>
      </div>
      
      {showForm && (
        <div className="project-form-container">
          <h3>Create New Project</h3>
          <form onSubmit={handleCreateProject}>
            <div className="form-group">
              <label htmlFor="title">Project Title*</label>
              <input
                type="text"
                id="title"
                name="title"
                value={newProject.title}
                onChange={handleChange}
                required
                placeholder="Enter project title"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={newProject.description}
                onChange={handleChange}
                rows="4"
                placeholder="Enter project description"
              />
            </div>
            
            <div className="form-buttons">
              <button 
                type="button" 
                className="cancel-btn"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="submit-btn"
                disabled={creating}
              >
                {creating ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="projects-list-section">
        <h3>Existing Projects</h3>
        {loading ? (
          <div className="loading">Loading projects...</div>
        ) : projects.length === 0 ? (
          <p>No projects available. Create your first project above.</p>
        ) : (
          <table className="projects-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(project => (
                <tr key={project.id}>
                  <td>{project.title}</td>
                  <td>{project.status}</td>
                  <td>{new Date(project.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="table-actions">
                      <Link to={`/projects/${project.id}`} className="view-btn">View</Link>
                      <Link to={`/projects/edit/${project.id}`} className="edit-btn">Edit</Link>
                      <button 
                        className="delete-btn"
                        onClick={() => handleDeleteProject(project.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ProjectAdmin;