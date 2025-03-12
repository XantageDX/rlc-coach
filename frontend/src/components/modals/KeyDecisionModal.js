import React, { useState, useEffect } from 'react';
import integrationEventService from '../../services/integrationEventService';

const KeyDecisionModal = ({ isOpen, onClose, onSave, projectId }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    integration_event_id: '',
    owner: '',
    decision_maker: ''
  });
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && projectId) {
      fetchEvents();
    }
  }, [isOpen, projectId]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await integrationEventService.getProjectEvents(projectId);
      setEvents(data);
    } catch (err) {
      setError('Failed to load integration events');
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
    
    // Log the form data being submitted
    console.log("Submitting KD form data:", formData);
    
    onSave(formData);
    
    // Reset form
    setFormData({
      title: '',
      description: '',
      integration_event_id: '',
      owner: '',
      decision_maker: '',
      sequence: '' // Make sure sequence is included here
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Add Key Decision</h3>
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
            <label htmlFor="integration_event_id">Integration Event*</label>
            <select
              id="integration_event_id"
              name="integration_event_id"
              value={formData.integration_event_id}
              onChange={handleChange}
              required
            >
              <option value="">Select an Integration Event</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
            {events.length === 0 && !loading && (
              <p className="note">
                No integration events available. <br />
                Please create one first.
              </p>
            )}
            {loading && <p className="note">Loading integration events...</p>}
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
            <label htmlFor="decision_maker">Decision Maker</label>
            <input
              type="text"
              id="decision_maker"
              name="decision_maker"
              value={formData.decision_maker}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-buttons">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="submit-btn"
              disabled={!formData.title || !formData.integration_event_id || loading}
            >
              Save Key Decision
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default KeyDecisionModal;