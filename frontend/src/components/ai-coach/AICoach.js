// import React, { useState, useRef, useEffect } from 'react';
// import aiCoachService from '../../services/aiCoachService';
// import { useModel } from '../../context/ModelContext';
// import './../../styles/ai-coach.css'; // Make sure styles are imported

// const AICoach = () => {
//   const [messages, setMessages] = useState([]);
//   const [inputText, setInputText] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [conversationId, setConversationId] = useState(null);
//   const [showSuggestions, setShowSuggestions] = useState(true); // State to control displaying suggestions

//   const { selectedModel } = useModel();
  
//   const messagesEndRef = useRef(null);
  
//   // Scroll to bottom of messages
//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   };
  
//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);
  
//   // Add initial welcome message
//   useEffect(() => {
//     setMessages([{
//       role: 'assistant',
//       content: 'Hello! I\'m your AI Coach for Rapid Learning Cycles. What would you like to know about RLC? Ask me a question in the box at the bottom of the screen or click on one of the following options to get started.'
//     }]);
    
//     // Generate a random conversation ID
//     setConversationId(`conversation-${Date.now()}`);
//   }, []);
  
//   // Define suggested prompts with their associated questions
//   const suggestedPrompts = [
//     {
//       buttonText: "Introduce me to the foundations of Rapid Learning Cycles", 
//       prompt: "Can you introduce me to the foundations of Rapid Learning Cycles methodology?"
//     },
//     {
//       buttonText: "What are the main concepts of RLC methodology?", 
//       prompt: "Please introduce me to the main concepts of RLC methodology"
//     },
//     {
//       buttonText: "Explain Key Decisions and Knowledge Gaps", 
//       prompt: "Can you explain what Key Decisions and Knowledge Gaps are in the RLC methodology and how they relate to each other?"
//     },
//     {
//       buttonText: "How to run an effective Learning Cycle?", 
//       prompt: "What are the best practices for running an effective Learning Cycle?"
//     },
//     {
//       buttonText: "Tips for successful Integration Events", 
//       prompt: "What are some tips for making Integration Events successful?"
//     }
//   ];
  
//   const handleSubmit = async (e) => {
//     e.preventDefault();
    
//     if (!inputText.trim()) return;
    
//     // Add user message
//     const userMessage = {
//       role: 'user',
//       content: inputText
//     };
    
//     setMessages(prev => [...prev, userMessage]);
//     setInputText('');
//     setIsLoading(true);
//     setError(null);
    
//     // Hide suggestions after first user input
//     setShowSuggestions(false);
    
//     try {
//       // Send to API with the selected model
//       const response = await aiCoachService.askQuestion(inputText, conversationId, selectedModel);
      
//       // Add assistant response
//       setMessages(prev => [...prev, {
//         role: 'assistant',
//         content: response.answer
//       }]);
      
//     } catch (err) {
//       console.error('Error from AI Coach:', err);
//       setError('Sorry, there was an error processing your question. Please try again.');
//     } finally {
//       setIsLoading(false);
//     }
//   };
  
//   // Function to handle clicking a suggested prompt
//   const handleSuggestedPrompt = async (promptText) => {
//     // Add user message with the prompt text
//     const userMessage = {
//       role: 'user',
//       content: promptText
//     };
    
//     setMessages(prev => [...prev, userMessage]);
//     setIsLoading(true);
//     setError(null);
    
//     // Hide suggestions after selection
//     setShowSuggestions(false);
    
//     try {
//       // Send to API with the selected model
//       const response = await aiCoachService.askQuestion(promptText, conversationId, selectedModel);
      
//       // Add assistant response
//       setMessages(prev => [...prev, {
//         role: 'assistant',
//         content: response.answer
//       }]);
      
//     } catch (err) {
//       console.error('Error from AI Coach:', err);
//       setError('Sorry, there was an error processing your question. Please try again.');
//     } finally {
//       setIsLoading(false);
//     }
//   };
  
//   return (
//     <div className="ai-coach-container">
//       {/* <div className="ai-coach-header">
//         <h2>AI Coach - RLC Methodology Guide</h2>
//         <p>Ask questions about Rapid Learning Cycles methodology and implementation</p>
//       </div> */}
      
//       {error && <div className="error-message">{error}</div>}
      
//       <div className="messages-container">
//         {messages.map((message, index) => (
//           <div 
//             key={index}
//             className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
//           >
//             <div className="message-content">
//               {message.content}
//             </div>
//           </div>
//         ))}
        
//         {/* Suggested prompts */}
//         {showSuggestions && messages.length === 1 && (
//           <div className="suggested-prompts">
//             {/* <div className="suggested-prompts-header">
//               What would you like to know about RLC?
//             </div> */}
//             <div className="prompt-buttons">
//               {suggestedPrompts.map((promptData, index) => (
//                 <button 
//                   key={index} 
//                   className="prompt-button"
//                   onClick={() => handleSuggestedPrompt(promptData.prompt)}
//                 >
//                   {promptData.buttonText}
//                 </button>
//               ))}
//             </div>
//           </div>
//         )}
        
//         {isLoading && (
//           <div className="message assistant-message">
//             <div className="message-content loading">
//               <div className="typing-indicator">
//                 <span></span>
//                 <span></span>
//                 <span></span>
//               </div>
//             </div>
//           </div>
//         )}
//         <div ref={messagesEndRef} />
//       </div>
      
//       <form onSubmit={handleSubmit} className="input-form">
//         <textarea
//           rows="3"
//           value={inputText}
//           onChange={(e) => setInputText(e.target.value)}
//           placeholder="Ask about RLC methodology..."
//           disabled={isLoading}
//           onKeyDown={(e) => {
//             if (e.key === 'Enter' && !e.shiftKey) {
//               e.preventDefault(); // Prevent default to avoid newline
//               handleSubmit(e);
//             }
//           }}
//         />
//         <button type="submit" disabled={isLoading || !inputText.trim()}>
//           {isLoading ? 'Thinking...' : 'Send'}
//         </button>
//       </form>
//     </div>
//   );
// };

// export default AICoach;

// CONTEXT IMPLEMENTATION
import React, { useRef, useEffect } from 'react';
import aiCoachService from '../../services/aiCoachService';
import { useModel } from '../../context/ModelContext';
import { useAICoach } from '../../context/AICoachContext';
import './../../styles/ai-coach.css';

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

  const { selectedModel } = useModel();
  const messagesEndRef = useRef(null);
  
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
      // Send to API with the selected model
      const response = await aiCoachService.askQuestion(inputText, conversationId, selectedModel);
      
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
      // Send to API with the selected model
      const response = await aiCoachService.askQuestion(promptText, conversationId, selectedModel);
      
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
  
  return (
    <div className="ai-coach-container">
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
    </div>
  );
};

export default AICoach;