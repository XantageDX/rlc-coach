import React, { useState } from 'react';
import './FeedbackButtons.css';

const FeedbackButtons = ({ messageId, onFeedbackSubmit }) => {
  const [showButtons, setShowButtons] = useState(false);
  
  const handleMouseEnter = () => setShowButtons(true);
  const handleMouseLeave = () => setShowButtons(false);
  
  const handleFeedback = (rating) => {
    onFeedbackSubmit(messageId, rating);
  };
  
  return (
    <div 
      className="feedback-buttons-container"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {showButtons && (
        <div className="feedback-buttons">
          <button 
            className="feedback-button thumbs-up"
            onClick={() => handleFeedback('positive')}
            aria-label="Thumbs up"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 11V22H3V11H7Z M21 11C21 9.9 20.1 9 19 9H15L15.63 5.25C15.94 4.31 15.38 3.31 14.45 3.08C13.52 2.84 12.6 3.37 12.35 4.29L11 9H10V22H18C19.1 22 20 21.1 20 20L21.41 13.41C21.78 12.62 21.5 11.67 20.8 11.25L21 11Z" fill="currentColor"/>
            </svg>
          </button>
          <button 
            className="feedback-button thumbs-down"
            onClick={() => handleFeedback('negative')}
            aria-label="Thumbs down"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 13V2H21V13H17Z M3 13C3 14.1 3.9 15 5 15H9L8.37 18.75C8.06 19.69 8.62 20.69 9.55 20.92C10.48 21.16 11.4 20.63 11.65 19.71L13 15H14V2H6C4.9 2 4 2.9 4 4L2.59 10.59C2.22 11.38 2.5 12.33 3.2 12.75L3 13Z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default FeedbackButtons;