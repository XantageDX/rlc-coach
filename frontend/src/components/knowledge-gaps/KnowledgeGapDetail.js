import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import knowledgeGapService from '../../services/knowledgeGapService';
import keyDecisionService from '../../services/keyDecisionService';

const KnowledgeGapDetail = () => {
  const [knowledgeGap, setKnowledgeGap] = useState(null);
  const [keyDecision, setKeyDecision] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { projectId, gapId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch knowledge gap details
        const kgData = await knowledgeGapService.getKnowledgeGapById(projectId, gapId);
        setKnowledgeGap(kgData);
        setEditData(kgData);
        
        // Fetch related key decision
        const kdData = await keyDecisionService.getKeyDecisionById(
          projectId, 
          kgData.key_decision_id
        );
        setKeyDecision(kdData);
        
        setLoading(false);
      } catch (err) {
        console.error("Error loading knowledge gap data:", err);
        setError("Failed to load knowledge gap details. Please try again.");
        setLoading(false);
      }
    };
    
    fetchData();
  }, [projectId, gapId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      // Format contributors if needed
      let dataToSave = {...editData};
      if (typeof dataToSave.contributors === 'string') {
        dataToSave.contributors = dataToSave.contributors.split(',').map(c => c.trim()).filter(c => c);
      }
      
      const updatedGap = await knowledgeGapService.updateKnowledgeGap(
        projectId,
        gapId,
        dataToSave
      );
      
      setKnowledgeGap(updatedGap);
      setIsEditing(false);
      
      // If key decision changed, refresh it
      if (updatedGap.key_decision_id !== knowledgeGap.key_decision_id) {
        const kdData = await keyDecisionService.getKeyDecisionById(
          projectId, 
          updatedGap.key_decision_id
        );
        setKeyDecision(kdData);
      }
    } catch (err) {
      console.error("Error updating knowledge gap:", err);
      setError("Failed to update knowledge gap. Please try again.");
    }
  };

  const handleCancelEdit = () => {
    setEditData(knowledgeGap);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this Knowledge Gap?")) {
      try {
        await knowledgeGapService.deleteKnowledgeGap(projectId, gapId);
        navigate(`/projects/${projectId}/key-decisions/${knowledgeGap.key_decision_id}`);
      } catch (err) {
        console.error("Error deleting knowledge gap:", err);
        setError("Failed to delete knowledge gap. Please try again.");
      }
    }
  };

  // Format date to readable format
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Format contributors array to string
  const formatContributors = (contributors) => {
    if (!contributors || contributors.length === 0) return 'None';
    return contributors.join(', ');
  };

  if (loading) {
    return <div className="loading">Loading knowledge gap details...</div>;
  }

  if (!knowledgeGap) {
    return <div className="error-message">Knowledge gap not found.</div>;
  }

  return (
    <div className="kg-detail-container">
      <div className="kg-detail-header">
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
            <h2>{knowledgeGap.title}</h2>
          )}
          <span className="status-badge">{knowledgeGap.status}</span>
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
      
      <div className="kg-detail-metadata">
        <div className="metadata-row">
          <div className="metadata-item">
            <strong>Key Decision:</strong> {isEditing ? (
              <select
                name="key_decision_id"
                value={editData.key_decision_id}
                onChange={handleChange}
              >
                <option value={keyDecision.id}>{keyDecision.title}</option>
                {/* Ideally load all decisions for selection */}
              </select>
            ) : (
              <a 
                href={`/projects/${projectId}/key-decisions/${knowledgeGap.key_decision_id}`}
                className="decision-link"
              >
                {keyDecision?.title || 'Unknown'}
              </a>
            )}
          </div>
          <div className="metadata-item">
            <strong>Status:</strong> {isEditing ? (
              <select
                name="status"
                value={editData.status}
                onChange={handleChange}
              >
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            ) : (
              knowledgeGap.status
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
              knowledgeGap.owner || 'None'
            )}
          </div>
          <div className="metadata-item">
            <strong>Learning Cycle:</strong> {isEditing ? (
              <input
                type="text"
                name="learning_cycle"
                value={editData.learning_cycle || ''}
                onChange={handleChange}
                placeholder="Learning Cycle"
              />
            ) : (
              knowledgeGap.learning_cycle || 'None'
            )}
          </div>
        </div>
        
        <div className="metadata-row">
          <div className="metadata-item">
            <strong>Contributors:</strong> {isEditing ? (
              <input
                type="text"
                name="contributors"
                value={Array.isArray(editData.contributors) ? editData.contributors.join(', ') : editData.contributors || ''}
                onChange={handleChange}
                placeholder="Contributors (comma separated)"
              />
            ) : (
              formatContributors(knowledgeGap.contributors)
            )}
          </div>
        </div>
        
        <div className="metadata-row">
          <div className="metadata-item">
            <strong>Created:</strong> {formatDate(knowledgeGap.created_at)}
          </div>
          {knowledgeGap.updated_at && (
            <div className="metadata-item">
              <strong>Last Updated:</strong> {formatDate(knowledgeGap.updated_at)}
            </div>
          )}
        </div>
      </div>
      
      <div className="kg-detail-section">
        <h3>Description</h3>
        {isEditing ? (
          <textarea
            name="description"
            value={editData.description || ''}
            onChange={handleChange}
            rows="4"
            placeholder="Description"
          />
        ) : (
          <p>{knowledgeGap.description || 'No description provided.'}</p>
        )}
      </div>
      
      <div className="kg-detail-section">
        <h3>What We Have Learned</h3>
        {isEditing ? (
          <textarea
            name="learned"
            value={editData.learned || ''}
            onChange={handleChange}
            rows="6"
            placeholder="Document what has been learned..."
          />
        ) : (
          <p>{knowledgeGap.learned || 'No learning documented yet.'}</p>
        )}
      </div>
      
      <div className="kg-detail-section">
        <h3>Recommendations</h3>
        {isEditing ? (
          <textarea
            name="recommendations"
            value={editData.recommendations || ''}
            onChange={handleChange}
            rows="6"
            placeholder="Provide recommendations based on learnings..."
          />
        ) : (
          <p>{knowledgeGap.recommendations || 'No recommendations provided yet.'}</p>
        )}
      </div>
      
      <div className="kg-detail-actions">
        <button
          className="back-btn"
          onClick={() => navigate(`/projects/${projectId}/key-decisions/${knowledgeGap.key_decision_id}`)}
        >
          Back to Key Decision
        </button>
        <button
          className="project-btn"
          onClick={() => navigate(`/projects/${projectId}`)}
        >
          Back to Project
        </button>
      </div>
    </div>
  );
};

export default KnowledgeGapDetail;