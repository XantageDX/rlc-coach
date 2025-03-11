// AICoach.js
import React, { useState, useRef, useEffect } from 'react';
import aiCoachService from '../../services/aiCoachService';

const AICoach = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  
  const messagesEndRef = useRef(null);
  
  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Add initial welcome message
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: 'Hello! I\'m your AI Coach for Rapid Learning Cycles. Ask me anything about the RLC methodology, and I\'ll do my best to help you understand and apply it effectively.'
    }]);
    
    // Generate a random conversation ID
    setConversationId(`conversation-${Date.now()}`);
  }, []);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!inputText.trim()) return;
    
    // Add user message
    const userMessage = {
      role: 'user',
      content: inputText
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setError(null);
    
    try {
      // Send to API
      const response = await aiCoachService.askQuestion(inputText, conversationId);
      
      // Add assistant response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.answer
      }]);
      
    } catch (err) {
      console.error('Error from AI Coach:', err);
      setError('Sorry, there was an error processing your question. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="ai-coach-container">
      <div className="ai-coach-header">
        <h2>AI Coach - RLC Methodology Guide</h2>
        <p>Ask questions about Rapid Learning Cycles methodology and implementation</p>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="messages-container">
        {messages.map((message, index) => (
          <div 
            key={index}
            className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
          >
            <div className="message-content">
              {message.content}
            </div>
          </div>
        ))}
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
      
      <form onSubmit={handleSubmit} className="input-form">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask about RLC methodology..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !inputText.trim()}>
          {isLoading ? 'Thinking...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default AICoach;