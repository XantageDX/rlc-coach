import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import projectService from '../../services/projectService';

const CoreHypothesis = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // If no projectId, try to get from localStorage
    if (!projectId) {
      const savedProjectId = localStorage.getItem('selectedProjectId');
      if (savedProjectId) {
        navigate(`/core-hypothesis/${savedProjectId}`);
      } else {
        navigate('/projects'); // Redirect to projects page to select one
      }
      return;
    }
    
    // Fetch project details
    const fetchProject = async () => {
      try {
        const data = await projectService.getProjectById(projectId);
        setProject(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching project:', err);
        setLoading(false);
      }
    };
    
    fetchProject();
  }, [projectId, navigate]);
  
  if (loading) {
    return <div className="loading">Loading project details...</div>;
  }
  
  return (
    <div className="core-hypothesis-container">
      <h2>Core Hypothesis Guide: {project?.title}</h2>
      <div className="core-hypothesis-content">
        <p>This is the Core Hypothesis Guide for your project. Here you can develop and refine your project's core hypothesis.</p>
        
        <div className="hypothesis-form">
          <h3>Core Hypothesis</h3>
          <textarea 
            rows="6" 
            placeholder="Enter your project's core hypothesis here..."
            className="hypothesis-textarea"
          ></textarea>
          <button className="save-hypothesis-btn">Save Hypothesis</button>
        </div>
      </div>
    </div>
  );
};

export default CoreHypothesis;