import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import projectService from '../../services/projectService';
import keyDecisionService from '../../services/keyDecisionService';
import knowledgeGapService from '../../services/knowledgeGapService';
import integrationEventService from '../../services/integrationEventService';
import KeyDecisionModal from '../modals/KeyDecisionModal';
import KnowledgeGapModal from '../modals/KnowledgeGapModal';

const ProjectDetail = () => {
  const [project, setProject] = useState(null);
  const [keyDecisions, setKeyDecisions] = useState([]);
  const [knowledgeGaps, setKnowledgeGaps] = useState([]);
  const [integrationEvents, setIntegrationEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isKDModalOpen, setIsKDModalOpen] = useState(false);
  const [isKGModalOpen, setIsKGModalOpen] = useState(false);
  
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        setLoading(true);
        const projectData = await projectService.getProjectById(id);
        setProject(projectData);
        
        // Fetch integration events
        const eventsData = await integrationEventService.getProjectEvents(id);
        setIntegrationEvents(eventsData);
        
        // Fetch key decisions
        const kdData = await keyDecisionService.getProjectKeyDecisions(id);
        setKeyDecisions(kdData);
        
        // Fetch knowledge gaps
        const kgData = await knowledgeGapService.getProjectKnowledgeGaps(id);
        setKnowledgeGaps(kgData);
        
        setLoading(false);
      } catch (err) {
        setError('Failed to load project details. Please try again.');
        setLoading(false);
      }
    };

    fetchProjectDetails();
  }, [id]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await projectService.deleteProject(id);
        navigate('/projects');
      } catch (err) {
        setError('Failed to delete project. Please try again.');
      }
    }
  };
  
  const handleKDSave = async (kdData) => {
    try {
      console.log("Saving Key Decision with data:", kdData);
      await keyDecisionService.createKeyDecision(id, kdData);
      // Refresh key decisions - use a different variable name
      const updatedDecisions = await keyDecisionService.getProjectKeyDecisions(id);
      setKeyDecisions(updatedDecisions);
      setIsKDModalOpen(false);
    } catch (err) {
      console.error("Error creating key decision:", err);
      setError('Failed to create key decision: ' + (err.response?.data?.detail || err.message));
    }
  };
  
  const handleKGSave = async (kgData) => {
    try {
      await knowledgeGapService.createKnowledgeGap(id, kgData);
      // Refresh knowledge gaps - use a different variable name
      const updatedGaps = await knowledgeGapService.getProjectKnowledgeGaps(id);
      setKnowledgeGaps(updatedGaps);
      setIsKGModalOpen(false);
    } catch (err) {
      console.error("Error creating knowledge gap:", err);
      setError('Failed to create knowledge gap: ' + (err.response?.data?.detail || err.message));
    }
  };
  
  const handleDeleteKD = async (kdId) => {
    if (window.confirm('Are you sure you want to delete this key decision?')) {
      try {
        await keyDecisionService.deleteKeyDecision(id, kdId);
        // Refresh key decisions
        const updatedKDs = await keyDecisionService.getProjectKeyDecisions(id);
        setKeyDecisions(updatedKDs);
      } catch (err) {
        setError('Failed to delete key decision.');
      }
    }
  };
  
  const handleDeleteKG = async (kgId) => {
    if (window.confirm('Are you sure you want to delete this knowledge gap?')) {
      try {
        await knowledgeGapService.deleteKnowledgeGap(id, kgId);
        // Refresh knowledge gaps
        const updatedKGs = await knowledgeGapService.getProjectKnowledgeGaps(id);
        setKnowledgeGaps(updatedKGs);
      } catch (err) {
        setError('Failed to delete knowledge gap.');
      }
    }
  };

  // Format date to readable format
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) {
    return <div className="loading">Loading project details...</div>;
  }

  if (!project) {
    return <div className="error-message">Project not found.</div>;
  }

  return (
    <div className="project-detail-container">
      <div className="project-detail-header">
        <h2>{project.title}</h2>
        <div className="project-status">{project.status}</div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="project-metadata">
        <div className="metadata-item">
          <strong>Created:</strong> {formatDate(project.created_at)}
        </div>
        {project.updated_at && (
          <div className="metadata-item">
            <strong>Last Updated:</strong> {formatDate(project.updated_at)}
          </div>
        )}
        <div className="metadata-item">
          <strong>Created By:</strong> {project.created_by}
        </div>
      </div>
      
      <div className="project-description">
        <h3>Description</h3>
        <p>{project.description || 'No description provided.'}</p>
      </div>
      
      <div className="project-actions">
        <button
          className="back-btn"
          onClick={() => navigate('/projects')}
        >
          Back to Projects
        </button>
        <button
          className="edit-btn"
          onClick={() => navigate(`/projects/edit/${project.id}`)}
        >
          Edit Project
        </button>
        <button
          className="delete-btn"
          onClick={handleDelete}
        >
          Delete Project
        </button>
        <button
          className="board-btn"
          onClick={() => navigate(`/projects/${id}/board`)}
        >
          Board View
        </button>
      </div>
      
      {/* Integration Events section */}
      <div className="project-section">
        <div className="section-header">
          <h3>Integration Events</h3>
          <button 
            className="add-btn"
            onClick={() => {
                const name = prompt('Enter Integration Event name:');
                if (name) {
                  integrationEventService.createEvent(id, { name })
                    .then(async () => {
                      const events = await integrationEventService.getProjectEvents(id);
                      setIntegrationEvents(events);
                    })
                    .catch(err => {
                      setError('Failed to create Integration Event');
                      console.error(err);
                    });
                }
              }}
          >
            Add Integration Event
          </button>
        </div>
        {integrationEvents.length === 0 ? (
          <p>No integration events yet.</p>
        ) : (
          <div className="events-list">
            {integrationEvents.map(event => (
              <div key={event.id} className="event-card">
                <h4>{event.name}</h4>
                <p>{event.description || 'No description'}</p>
                {event.date && <p><strong>Date:</strong> {formatDate(event.date)}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="project-sections">
        {/* Key Decisions section */}
        <div className="section">
          <div className="section-header">
            <h3>Key Decisions</h3>
            <button 
              className="add-btn"
              onClick={() => setIsKDModalOpen(true)}
            >
              Add Key Decision
            </button>
          </div>
          
          {keyDecisions.length === 0 ? (
            <p>No key decisions yet.</p>
          ) : (
            <div className="decision-list">
              {keyDecisions.map(decision => (
                <div key={decision.id} className="decision-card">
                  <div className="decision-header">
                    <h4>{decision.title}</h4>
                    <span className="status-badge">{decision.status}</span>
                  </div>
                  <p>{decision.description || 'No description'}</p>
                  {decision.owner && <p><strong>Owner:</strong> {decision.owner}</p>}
                  {decision.decision_maker && <p><strong>Decision Maker:</strong> {decision.decision_maker}</p>}
                  <div className="card-actions">
                    <button 
                      className="small-btn view-btn"
                      onClick={() => navigate(`/projects/${project.id}/key-decisions/${decision.id}`)}
                    >
                      View
                    </button>
                    <button 
                      className="small-btn edit-btn"
                      onClick={() => alert(`Edit ${decision.title}`)}
                    >
                      Edit
                    </button>
                    <button 
                      className="small-btn delete-btn"
                      onClick={() => handleDeleteKD(decision.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Knowledge Gaps section */}
        <div className="section">
          <div className="section-header">
            <h3>Knowledge Gaps</h3>
            <button 
              className="add-btn"
              onClick={() => setIsKGModalOpen(true)}
            >
              Add Knowledge Gap
            </button>
          </div>
          
          {knowledgeGaps.length === 0 ? (
            <p>No knowledge gaps yet.</p>
          ) : (
            <div className="gap-list">
              {knowledgeGaps.map(gap => (
                <div key={gap.id} className="gap-card">
                  <div className="gap-header">
                    <h4>{gap.title}</h4>
                    <span className="status-badge">{gap.status}</span>
                  </div>
                  <p>{gap.description || 'No description'}</p>
                  {gap.owner && <p><strong>Owner:</strong> {gap.owner}</p>}
                  {gap.learning_cycle && <p><strong>Learning Cycle:</strong> {gap.learning_cycle}</p>}
                  <div className="card-actions">
                  <button 
                      className="small-btn view-btn"
                      onClick={() => navigate(`/projects/${project.id}/knowledge-gaps/${gap.id}`)}
                    >
                      View
                    </button>
                    <button 
                      className="small-btn edit-btn"
                      onClick={() => alert(`Edit ${gap.title}`)}
                    >
                      Edit
                    </button>
                    <button 
                      className="small-btn delete-btn"
                      onClick={() => handleDeleteKG(gap.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Modals */}
      <KeyDecisionModal 
        isOpen={isKDModalOpen}
        onClose={() => setIsKDModalOpen(false)}
        onSave={handleKDSave}
        projectId={id}
      />
      
      <KnowledgeGapModal
        isOpen={isKGModalOpen}
        onClose={() => setIsKGModalOpen(false)}
        onSave={handleKGSave}
        projectId={id}
      />
    </div>
  );
};

export default ProjectDetail;