import React, { useState, useEffect } from 'react';
import keyDecisionService from '../../services/keyDecisionService';

const KnowledgeGapModal = ({ isOpen, onClose, onSave, projectId }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    key_decision_id: '',
    owner: '',
    contributors: '',
    learning_cycle: ''
  });
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && projectId) {
      fetchDecisions();
    }
  }, [isOpen, projectId]);

  const fetchDecisions = async () => {
    try {
      setLoading(true);
      const data = await keyDecisionService.getProjectKeyDecisions(projectId);
      setDecisions(data);
    } catch (err) {
      setError('Failed to load key decisions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Convert contributors from comma-separated string to array
    const formattedData = {
      ...formData,
      contributors: formData.contributors ? formData.contributors.split(',').map(c => c.trim()) : []
    };
    
    onSave(formattedData);
    
    // Reset form
    setFormData({
      title: '',
      description: '',
      key_decision_id: '',
      owner: '',
      contributors: '',
      learning_cycle: ''
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Add Knowledge Gap</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="title">Title*</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="key_decision_id">Key Decision*</label>
            <select
              id="key_decision_id"
              name="key_decision_id"
              value={formData.key_decision_id}
              onChange={handleChange}
              required
            >
              <option value="">Select a Key Decision</option>
              {decisions.map(decision => (
                <option key={decision.id} value={decision.id}>
                  {decision.title}
                </option>
              ))}
            </select>
            {decisions.length === 0 && !loading && (
              <p className="note">
                No key decisions available. <br />
                Please create one first.
              </p>
            )}
            {loading && <p className="note">Loading key decisions...</p>}
          </div>
          
          <div className="form-group">
            <label htmlFor="owner">Owner</label>
            <input
              type="text"
              id="owner"
              name="owner"
              value={formData.owner}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="contributors">Contributors (comma-separated)</label>
            <input
              type="text"
              id="contributors"
              name="contributors"
              value={formData.contributors}
              onChange={handleChange}
              placeholder="e.g. John Doe, Jane Smith"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="learning_cycle">Learning Cycle</label>
            <input
              type="text"
              id="learning_cycle"
              name="learning_cycle"
              value={formData.learning_cycle}
              onChange={handleChange}
              placeholder="e.g. Sprint 1, Q1 2024"
            />
          </div>
          
          <div className="form-buttons">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="submit-btn"
              disabled={!formData.title || !formData.key_decision_id || loading}
            >
              Save Knowledge Gap
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default KnowledgeGapModal;