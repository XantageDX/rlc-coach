import React, { useRef, useEffect, useState } from 'react';
import aiCoachService from '../../services/aiCoachService';
// REMOVED: import { useModel } from '../../context/ModelContext';
import { useAICoach } from '../../context/AICoachContext';
import './../../styles/ai-coach.css';

// FEEDBACK
import FeedbackButtons from '../common/FeedbackButtons';
import FeedbackModal from '../common/FeedbackModal';
import feedbackService from '../../services/feedbackService';

// Markdown implementation
import MarkdownRenderer from '../common/MarkdownRenderer';

const AICoach = () => {
  // Get everything from context instead of local state
  const {
    messages,
    inputText,
    isLoading,
    error,
    conversationId,
    showSuggestions,
    addMessage,
    setInputText,
    setLoading,
    setError,
    setShowSuggestions,
    clearConversation,
    clearCurrentMessage
  } = useAICoach();

  // REMOVED: const { selectedModel } = useModel(); // No longer needed - backend forces Llama 3.3
  const messagesEndRef = useRef(null);
  
  // FEEDBACK - moved inside component
  const [feedbackMessageId, setFeedbackMessageId] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const handleFeedbackSubmit = (messageId, rating) => {
    setFeedbackMessageId(messageId);
    setFeedbackRating(rating);
    setShowFeedbackModal(true);
  };

  const handleFeedbackModalSubmit = async (feedbackText) => {
    try {
      // Find the message that feedback is for
      const message = messages.find((msg, idx) => idx === feedbackMessageId);
      if (!message) return;
      
      // Get the previous user message if this is an AI response
      const previousUserMessage = feedbackMessageId > 0 && message.role === 'assistant' 
        ? messages[feedbackMessageId - 1]?.content || ''
        : '';
      
      await feedbackService.submitFeedback({
        component: 'AICoach',
        modelId: 'llama-3.3-70b', // Fixed model for feedback tracking
        conversationId,
        userInput: previousUserMessage,
        aiOutput: message.content,
        rating: feedbackRating,
        feedbackText
      });
      
      // Show success message (optional)
      console.log('Feedback submitted successfully');
      
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setShowFeedbackModal(false);
    }
  };
  // END FEEDBACK

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Define suggested prompts with their associated questions
  const suggestedPrompts = [
    {
      buttonText: "Introduce me to the foundations of Rapid Learning Cycles", 
      prompt: "Can you introduce me to the foundations of Rapid Learning Cycles methodology?"
    },
    {
      buttonText: "What are the main concepts of RLC methodology?", 
      prompt: "Please introduce me to the main concepts of RLC methodology"
    },
    {
      buttonText: "Explain Key Decisions and Knowledge Gaps", 
      prompt: "Can you explain what Key Decisions and Knowledge Gaps are in the RLC methodology and how they relate to each other?"
    },
    {
      buttonText: "How to run an effective Learning Cycle?", 
      prompt: "What are the best practices for running an effective Learning Cycle?"
    },
    {
      buttonText: "Tips for successful Integration Events", 
      prompt: "What are some tips for making Integration Events successful?"
    }
  ];
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!inputText.trim()) return;
    
    // Add user message
    const userMessage = {
      role: 'user',
      content: inputText
    };
    
    addMessage(userMessage);
    clearCurrentMessage(); // Clear input text
    setLoading(true);
    setError(null);
    
    // Hide suggestions after first user input
    setShowSuggestions(false);
    
    try {
      // Send to API without model selection - backend now forces Llama 3.3
      const response = await aiCoachService.askQuestion(inputText, conversationId);
      
      // Add assistant response
      addMessage({
        role: 'assistant',
        content: response.answer
      });
      
    } catch (err) {
      console.error('Error from AI Coach:', err);
      setError('Sorry, there was an error processing your question. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Function to handle clicking a suggested prompt
  const handleSuggestedPrompt = async (promptText) => {
    // Add user message with the prompt text
    const userMessage = {
      role: 'user',
      content: promptText
    };
    
    addMessage(userMessage);
    setLoading(true);
    setError(null);
    
    // Hide suggestions after selection
    setShowSuggestions(false);
    
    try {
      // Send to API without model selection - backend now forces Llama 3.3
      const response = await aiCoachService.askQuestion(promptText, conversationId);
      
      // Add assistant response
      addMessage({
        role: 'assistant',
        content: response.answer
      });
      
    } catch (err) {
      console.error('Error from AI Coach:', err);
      setError('Sorry, there was an error processing your question. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle New Chat button click
  const handleNewChat = () => {
    clearConversation();
  };

  // FEEDBACK RETURN
  return (
    <div className="ai-coach-container">
      {error && <div className="error-message">{error}</div>}
      
      {/* PHASE 2 IMPROVEMENT: Show model info banner */}
      {/* <div className="model-info-banner">
        <span className="model-badge">🚀 Powered by Llama 3.3 70B</span>
        <span className="model-description">Optimized for RLC methodology guidance</span>
      </div> */}
      <div className="ai-coach-disclaimer">
        <div className="disclaimer-content">
          <strong>Disclaimer:</strong> This AI Coach is still under development, please use the feedback tool to comment on any answers that may be incorrect. Please also indicate if answers are good, it will help reinforce the model.
        </div>
      </div>
      
      <div className="messages-container">
        {messages.map((message, index) => (
          <div 
            key={index}
            className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
          >
            <div className="message-wrapper">
              <div className="message-content">
                <MarkdownRenderer 
                  content={message.content} 
                  onDocumentClick={() => {}} 
                />
              </div>
              
              {/* Add feedback buttons only to assistant messages */}
              {message.role === 'assistant' && (
                <FeedbackButtons 
                  messageId={index}
                  onFeedbackSubmit={handleFeedbackSubmit}
                />
              )}
            </div>
          </div>
        ))}
        
        {/* Suggested prompts */}
        {showSuggestions && messages.length === 1 && (
          <div className="suggested-prompts">
            <div className="prompt-buttons">
              {suggestedPrompts.map((promptData, index) => (
                <button 
                  key={index} 
                  className="prompt-button"
                  onClick={() => handleSuggestedPrompt(promptData.prompt)}
                  disabled={isLoading}
                >
                  {promptData.buttonText}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {isLoading && (
          <div className="message assistant-message">
            <div className="message-content loading">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="input-section">
        <form onSubmit={handleSubmit} className="input-form">
          <div className="input-container">
            <textarea
              rows="3"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask about RLC methodology..."
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <button 
              type="submit" 
              className="send-btn" 
              disabled={isLoading || !inputText.trim()}
              aria-label="Send message"
            >
              {isLoading ? (
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 20L12 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5 11L12 4L19 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>
        </form>
        
        {/* New Session button repositioned */}
        <button 
          className="new-session-btn"
          onClick={handleNewChat}
          disabled={isLoading}
        >
          New Session
        </button>
      </div>
      
      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        rating={feedbackRating}
        onClose={() => setShowFeedbackModal(false)}
        onSubmit={handleFeedbackModalSubmit}
      />
    </div>
  );
};

export default AICoach;