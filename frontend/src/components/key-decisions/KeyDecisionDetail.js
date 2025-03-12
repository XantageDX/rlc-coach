import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import keyDecisionService from '../../services/keyDecisionService';
import knowledgeGapService from '../../services/knowledgeGapService';
import integrationEventService from '../../services/integrationEventService';
import KnowledgeGapModal from '../modals/KnowledgeGapModal';

const KeyDecisionDetail = () => {
  const [decision, setDecision] = useState(null);
  const [knowledgeGaps, setKnowledgeGaps] = useState([]);
  const [integrationEvent, setIntegrationEvent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [isKGModalOpen, setIsKGModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { projectId, decisionId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch decision details
        const decisionData = await keyDecisionService.getKeyDecisionById(projectId, decisionId);
        setDecision(decisionData);
        setEditData(decisionData);
        
        // Fetch integration event
        const eventData = await integrationEventService.getEventById(
          projectId, 
          decisionData.integration_event_id
        );
        setIntegrationEvent(eventData);
        
        // Fetch knowledge gaps for this decision
        const kgData = await knowledgeGapService.getProjectKnowledgeGaps(
          projectId, 
          decisionId
        );
        setKnowledgeGaps(kgData);
        
        setLoading(false);
      } catch (err) {
        console.error("Error loading decision data:", err);
        setError("Failed to load decision details. Please try again.");
        setLoading(false);
      }
    };
    
    fetchData();
  }, [projectId, decisionId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      const updatedDecision = await keyDecisionService.updateKeyDecision(
        projectId,
        decisionId,
        editData
      );
      
      setDecision(updatedDecision);
      setIsEditing(false);
      
      // If integration event changed, refresh it
      if (updatedDecision.integration_event_id !== decision.integration_event_id) {
        const eventData = await integrationEventService.getEventById(
          projectId, 
          updatedDecision.integration_event_id
        );
        setIntegrationEvent(eventData);
      }
    } catch (err) {
      console.error("Error updating decision:", err);
      setError("Failed to update key decision. Please try again.");
    }
  };

  const handleCancelEdit = () => {
    setEditData(decision);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this Key Decision?")) {
      try {
        await keyDecisionService.deleteKeyDecision(projectId, decisionId);
        navigate(`/projects/${projectId}`);
      } catch (err) {
        console.error("Error deleting decision:", err);
        setError("Failed to delete key decision. Please try again.");
      }
    }
  };

  const handleDeleteKG = async (kgId) => {
    if (window.confirm("Are you sure you want to delete this Knowledge Gap?")) {
      try {
        await knowledgeGapService.deleteKnowledgeGap(projectId, kgId);
        
        // Refresh knowledge gaps
        const kgData = await knowledgeGapService.getProjectKnowledgeGaps(
          projectId, 
          decisionId
        );
        setKnowledgeGaps(kgData);
      } catch (err) {
        console.error("Error deleting knowledge gap:", err);
        setError("Failed to delete knowledge gap. Please try again.");
      }
    }
  };
  
  const handleKGSave = async (kgData) => {
    try {
      // Add the key decision ID 
      const fullData = {
        ...kgData,
        key_decision_id: decisionId
      };
      
      await knowledgeGapService.createKnowledgeGap(projectId, fullData);
      
      // Refresh knowledge gaps
      const updatedKGs = await knowledgeGapService.getProjectKnowledgeGaps(
        projectId, 
        decisionId
      );
      setKnowledgeGaps(updatedKGs);
      
      setIsKGModalOpen(false);
    } catch (err) {
      console.error("Error creating knowledge gap:", err);
      setError("Failed to create knowledge gap: " + (err.response?.data?.detail || err.message));
    }
  };

  // Format date to readable format
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) {
    return <div className="loading">Loading key decision details...</div>;
  }

  if (!decision) {
    return <div className="error-message">Key decision not found.</div>;
  }

  return (
    <div className="kd-detail-container">
      <div className="kd-detail-header">
        <div className="header-left">
          {isEditing ? (
            <input
              type="text"
              name="title"
              value={editData.title}
              onChange={handleChange}
              className="title-input"
            />
          ) : (
            <h2>{decision.title}</h2>
          )}
          <span className="status-badge">{decision.status}</span>
        </div>
        <div className="header-actions">
          {isEditing ? (
            <>
              <button className="save-btn" onClick={handleSave}>Save</button>
              <button className="cancel-btn" onClick={handleCancelEdit}>Cancel</button>
            </>
          ) : (
            <>
              <button className="edit-btn" onClick={() => setIsEditing(true)}>Edit</button>
              <button className="delete-btn" onClick={handleDelete}>Delete</button>
            </>
          )}
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="kd-detail-metadata">
        <div className="metadata-row">
          <div className="metadata-item">
            <strong>Sequence Number:</strong> {isEditing ? (
              <input
                type="text"
                name="sequence"
                value={editData.sequence || ''}
                onChange={handleChange}
                placeholder="##"
                style={{ width: '60px' }}
              />
            ) : (
              `KD${decision.sequence || '??'}`
            )}
          </div>
          <div className="metadata-item">
            <strong>Integration Event:</strong> {isEditing ? (
              <select
                name="integration_event_id"
                value={editData.integration_event_id}
                onChange={handleChange}
              >
                <option value={integrationEvent.id}>{integrationEvent.name}</option>
                {/* Ideally load all events for selection */}
              </select>
            ) : (
              integrationEvent?.name || 'None'
            )}
          </div>
          <div className="metadata-item">
            <strong>Status:</strong> {isEditing ? (
              <select
                name="status"
                value={editData.status}
                onChange={handleChange}
              >
                <option value="draft">Draft</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="completed">Completed</option>
              </select>
            ) : (
              decision.status
            )}
          </div>
        </div>
        
        <div className="metadata-row">
          <div className="metadata-item">
            <strong>Owner:</strong> {isEditing ? (
              <input
                type="text"
                name="owner"
                value={editData.owner || ''}
                onChange={handleChange}
                placeholder="Owner"
              />
            ) : (
              decision.owner || 'None'
            )}
          </div>
          <div className="metadata-item">
            <strong>Decision Maker:</strong> {isEditing ? (
              <input
                type="text"
                name="decision_maker"
                value={editData.decision_maker || ''}
                onChange={handleChange}
                placeholder="Decision Maker"
              />
            ) : (
              decision.decision_maker || 'None'
            )}
          </div>
        </div>
        
        <div className="metadata-row">
          <div className="metadata-item">
            <strong>Created:</strong> {formatDate(decision.created_at)}
          </div>
          {decision.updated_at && (
            <div className="metadata-item">
              <strong>Last Updated:</strong> {formatDate(decision.updated_at)}
            </div>
          )}
        </div>
      </div>
      
      {/* The Key Decision (formerly just Description) */}
      <div className="kd-detail-section">
        <h3>The Key Decision</h3>
        {isEditing ? (
          <textarea
            name="description"
            value={editData.description || ''}
            onChange={handleChange}
            rows="4"
            placeholder="Describe the key decision to be made..."
          />
        ) : (
          <p>{decision.description || 'No description provided.'}</p>
        )}
      </div>
      
      {/* Purpose section - new */}
      <div className="kd-detail-section">
        <h3>The Purpose</h3>
        <p className="section-hint">(link back to the project's Objectives)</p>
        {isEditing ? (
          <textarea
            name="purpose"
            value={editData.purpose || ''}
            onChange={handleChange}
            rows="3"
            placeholder="Explain the purpose of this decision..."
          />
        ) : (
          <p>{decision.purpose || 'No purpose provided.'}</p>
        )}
      </div>
      
      {/* What We Have Done section - new */}
      <div className="kd-detail-section">
        <h3>What We Have Done</h3>
        <p className="section-hint">Summary of work to close knowledge gaps and build stakeholder alignment</p>
        
        {knowledgeGaps.length > 0 && (
          <div className="related-knowledge-gaps">
            <strong>Related Knowledge Gaps:</strong>
            <ul>
              {knowledgeGaps.map(gap => (
                <li key={gap.id}>
                  KG {decision.sequence || '??'}-{gap.sequence || '??'}: {gap.title}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {isEditing ? (
          <textarea
            name="what_we_have_done"
            value={editData.what_we_have_done || ''}
            onChange={handleChange}
            rows="4"
            placeholder="Describe what has been done so far..."
          />
        ) : (
          <p>{decision.what_we_have_done || 'No work documented yet.'}</p>
        )}
      </div>
      
      {/* What We Have Learned section - new */}
      <div className="kd-detail-section">
        <h3>What We Have Learned</h3>
        <p className="section-hint">Summary of all Knowledge Gaps</p>
        {isEditing ? (
          <textarea
            name="what_we_have_learned"
            value={editData.what_we_have_learned || ''}
            onChange={handleChange}
            rows="4"
            placeholder="Summarize what has been learned..."
          />
        ) : (
          <p>{decision.what_we_have_learned || 'No learning documented yet.'}</p>
        )}
      </div>
      
      {/* Recommendations section - new */}
      <div className="kd-detail-section">
        <h3>What We Recommend / What We Have Decided</h3>
        {isEditing ? (
          <textarea
            name="recommendations"
            value={editData.recommendations || ''}
            onChange={handleChange}
            rows="4"
            placeholder="Provide recommendations or document the decision..."
          />
        ) : (
          <p>{decision.recommendations || 'No recommendations or decisions documented yet.'}</p>
        )}
      </div>
      
      <div className="kd-detail-actions">
        <button
          className="back-btn"
          onClick={() => navigate(`/projects/${projectId}`)}
        >
          Back to Project
        </button>
        <button
          className="board-btn"
          onClick={() => navigate(`/projects/${projectId}/board`)}
        >
          Board View
        </button>
      </div>
      
      {/* Knowledge Gaps section */}
      <div className="kd-detail-section">
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
          <p className="no-items">No knowledge gaps yet for this key decision.</p>
        ) : (
          <div className="knowledge-gaps-list">
            {knowledgeGaps.map(gap => (
              <div key={gap.id} className="knowledge-gap-card">
                <div className="gap-header">
                  <h4>KG {decision.sequence || '??'}-{gap.sequence || '??'}: {gap.title}</h4>
                  <span className="status-badge">{gap.status}</span>
                </div>
                <p>{gap.description || 'No description'}</p>
                {gap.owner && <p><strong>Owner:</strong> {gap.owner}</p>}
                {gap.learning_cycle && <p><strong>Learning Cycle:</strong> {gap.learning_cycle}</p>}
                <div className="gap-actions">
                  <button 
                    className="view-btn"
                    onClick={() => navigate(`/projects/${projectId}/knowledge-gaps/${gap.id}`)}
                  >
                    View Details
                  </button>
                  <button 
                    className="delete-btn"
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
      
      {/* Knowledge Gap Modal */}
      <KnowledgeGapModal
        isOpen={isKGModalOpen}
        onClose={() => setIsKGModalOpen(false)}
        onSave={handleKGSave}
        projectId={projectId}
        keyDecisionId={decisionId}
        keyDecisionSequence={decision.sequence}
      />
    </div>
  );
};

export default KeyDecisionDetail;