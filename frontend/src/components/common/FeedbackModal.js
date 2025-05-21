import React, { useState } from 'react';
import './FeedbackModal.css';

const FeedbackModal = ({ isOpen, rating, onClose, onSubmit }) => {
  const [feedbackText, setFeedbackText] = useState('');
  
  if (!isOpen) return null;
  
  const handleSubmit = () => {
    onSubmit(feedbackText);
    setFeedbackText('');
    onClose();
  };
  
  return (
    <div className="feedback-modal-overlay">
      <div className="feedback-modal">
        <div className="feedback-modal-header">
          <h3>
            {rating === 'positive' 
              ? 'What did you like about this response?' 
              : 'What was wrong with this response?'}
          </h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="feedback-modal-body">
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Your feedback helps us improve (optional)"
            rows={4}
          />
        </div>
        <div className="feedback-modal-footer">
          <button className="cancel-button" onClick={onClose}>Cancel</button>
          <button className="submit-button" onClick={handleSubmit}>Submit Feedback</button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;