import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import projectService from '../../services/projectService';

const CreateProject = () => {
  const [projectData, setProjectData] = useState({
    title: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProjectData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await projectService.createProject(projectData);
      navigate('/projects');
    } catch (err) {
      setError('Failed to create project. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="create-project-container">
      <div className="create-project-form">
        <h2>Create New Project</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Project Title*</label>
            <input
              type="text"
              id="title"
              name="title"
              value={projectData.title}
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
              value={projectData.description}
              onChange={handleChange}
              rows="4"
              placeholder="Enter project description"
            />
          </div>
          
          <div className="form-buttons">
            <button 
              type="button" 
              className="cancel-btn"
              onClick={() => navigate('/projects')}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="submit-btn"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProject;