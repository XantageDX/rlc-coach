import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import projectService from '../../services/projectService';

const EditProject = () => {
  const [projectData, setProjectData] = useState({
    title: '',
    description: '',
    status: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const data = await projectService.getProjectById(id);
        setProjectData({
          title: data.title,
          description: data.description || '',
          status: data.status
        });
        setLoading(false);
      } catch (err) {
        setError('Failed to load project details. Please try again.');
        setLoading(false);
      }
    };

    fetchProject();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProjectData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await projectService.updateProject(id, projectData);
      navigate(`/projects/${id}`);
    } catch (err) {
      setError('Failed to update project. Please try again.');
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading project details...</div>;
  }

  return (
    <div className="edit-project-container">
      <div className="edit-project-form">
        <h2>Edit Project</h2>
        
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
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={projectData.status}
              onChange={handleChange}
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>
          
          <div className="form-buttons">
            <button 
              type="button" 
              className="cancel-btn"
              onClick={() => navigate(`/projects/${id}`)}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="submit-btn"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProject;