import React from 'react';
import { useNavigate } from 'react-router-dom';

const ProjectCard = ({ project, onDelete }) => {
  const navigate = useNavigate();
  
  // Format date to readable format
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="project-card">
      <div className="project-card-header">
        <h3>{project.title}</h3>
        <span className="project-status">{project.status}</span>
      </div>
      
      <div className="project-card-body">
        <p>{project.description || 'No description provided.'}</p>
        <div className="project-dates">
          <div>Created: {formatDate(project.created_at)}</div>
          {project.updated_at && (
            <div>Updated: {formatDate(project.updated_at)}</div>
          )}
        </div>
      </div>
      
      <div className="project-card-footer">
        <button 
          className="view-btn"
          onClick={() => navigate(`/projects/${project.id}`)}
        >
          View Details
        </button>
        <button 
          className="edit-btn"
          onClick={() => navigate(`/projects/edit/${project.id}`)}
        >
          Edit
        </button>
        <button 
          className="delete-btn"
          onClick={onDelete}
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default ProjectCard;