import React, { createContext, useContext, useReducer, useEffect } from 'react';
import aiCoachService from '../services/aiCoachService';

import { AuthContext } from './AuthContext'; // ← ADD THIS IMPORT

// Create the context
const AICoachContext = createContext();

// Define the initial state
const initialState = {
  messages: [],
  inputText: '',
  isLoading: false,
  error: null,
  conversationId: null,
  showSuggestions: true
};

// Define action types
const actionTypes = {
  SET_MESSAGES: 'SET_MESSAGES',
  ADD_MESSAGE: 'ADD_MESSAGE',
  SET_INPUT_TEXT: 'SET_INPUT_TEXT',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_CONVERSATION_ID: 'SET_CONVERSATION_ID',
  SET_SHOW_SUGGESTIONS: 'SET_SHOW_SUGGESTIONS',
  CLEAR_CONVERSATION: 'CLEAR_CONVERSATION',
  CLEAR_CURRENT_MESSAGE: 'CLEAR_CURRENT_MESSAGE',
  RESTORE_STATE: 'RESTORE_STATE'
};

// Reducer function
const aiCoachReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.SET_MESSAGES:
      return { ...state, messages: action.payload };
    case actionTypes.ADD_MESSAGE:
      return { ...state, messages: [...state.messages, action.payload] };
    case actionTypes.SET_INPUT_TEXT:
      return { ...state, inputText: action.payload };
    case actionTypes.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case actionTypes.SET_ERROR:
      return { ...state, error: action.payload };
    case actionTypes.SET_CONVERSATION_ID:
      return { ...state, conversationId: action.payload };
    case actionTypes.SET_SHOW_SUGGESTIONS:
      return { ...state, showSuggestions: action.payload };
    case actionTypes.CLEAR_CONVERSATION:
      return {
        ...initialState,
        conversationId: `conversation-${Date.now()}`,
        messages: [{
          role: 'assistant',
          content: 'Hello! I\'m your AI Coach for Rapid Learning Cycles. What would you like to know about RLC? Ask me a question in the box at the bottom of the screen or click on one of the following options to get started.'
        }]
      };
    case actionTypes.CLEAR_CURRENT_MESSAGE:
      return { ...state, inputText: '' };
    case actionTypes.RESTORE_STATE:
      return { ...state, ...action.payload };
    default:
      return state;
  }
};

// localStorage key
// const STORAGE_KEY = 'rlc-aicoach-state';
// Dynamic storage key based on current user
const getStorageKey = (userEmail) => {
  return userEmail ? `rlc-aicoach-state-${userEmail}` : 'rlc-aicoach-state-guest';
};

// Helper function to save state to localStorage
// const saveStateToStorage = (state) => {
//   try {
//     const stateToSave = {
//       messages: state.messages,
//       inputText: state.inputText,
//       conversationId: state.conversationId,
//       showSuggestions: state.showSuggestions
//     };
//     localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
//   } catch (error) {
//     console.warn('Failed to save AI Coach state to localStorage:', error);
//   }
// };
const saveStateToStorage = (state, userEmail) => {
  try {
    const stateToSave = {
      messages: state.messages,
      inputText: state.inputText,
      conversationId: state.conversationId,
      showSuggestions: state.showSuggestions
    };
    const storageKey = getStorageKey(userEmail);
    localStorage.setItem(storageKey, JSON.stringify(stateToSave));
  } catch (error) {
    console.warn('Failed to save AI Coach state to localStorage:', error);
  }
};

// Helper function to load state from localStorage
// const loadStateFromStorage = () => {
//   try {
//     const savedState = localStorage.getItem(STORAGE_KEY);
//     if (savedState) {
//       return JSON.parse(savedState);
//     }
//   } catch (error) {
//     console.warn('Failed to load AI Coach state from localStorage:', error);
//   }
//   return null;
// };
const loadStateFromStorage = (userEmail) => {
  try {
    const storageKey = getStorageKey(userEmail);
    const savedState = localStorage.getItem(storageKey);
    if (savedState) {
      return JSON.parse(savedState);
    }
  } catch (error) {
    console.warn('Failed to load AI Coach state from localStorage:', error);
  }
  return null;
};

// Provider component
// export const AICoachProvider = ({ children }) => {
//   const [state, dispatch] = useReducer(aiCoachReducer, initialState);

//   // Load state from localStorage on initialization
//   // useEffect(() => {
//   //   const savedState = loadStateFromStorage();
//   //   if (savedState) {
//   //     // If we have saved state, restore it
//   //     dispatch({ type: actionTypes.RESTORE_STATE, payload: savedState });
//   //   } else {
//   //     // If no saved state, initialize with welcome message
//   //     const welcomeMessage = {
//   //       role: 'assistant',
//   //       content: 'Hello! I\'m your AI Coach for Rapid Learning Cycles. What would you like to know about RLC? Ask me a question in the box at the bottom of the screen or click on one of the following options to get started.'
//   //     };
//   //     const conversationId = `conversation-${Date.now()}`;
      
//   //     dispatch({ type: actionTypes.SET_MESSAGES, payload: [welcomeMessage] });
//   //     dispatch({ type: actionTypes.SET_CONVERSATION_ID, payload: conversationId });
//   //   }
//   // }, []);
//   // useEffect(() => {
//   //   // Get current user email for user-specific storage
//   //   const user = JSON.parse(localStorage.getItem('user') || 'null');
//   //   const userEmail = user?.email;
    
//   //   const savedState = loadStateFromStorage(userEmail);
//   //   if (savedState) {
//   //     dispatch({ type: actionTypes.RESTORE_STATE, payload: savedState });
//   //   } else {
//   //     // Set welcome message if no saved state
//   //     const welcomeMessage = {
//   //       id: Date.now(),
//   //       type: 'ai',
//   //       content: 'Hello! I\'m your AI Coach for Rapid Learning Cycles. What would you like to know about RLC? Ask me a question in the box at the bottom of the screen or click on one of the following options to get started.'
//   //     };
//   //     const conversationId = `conversation-${Date.now()}`;
      
//   //     dispatch({ type: actionTypes.SET_MESSAGES, payload: [welcomeMessage] });
//   //     dispatch({ type: actionTypes.SET_CONVERSATION_ID, payload: conversationId });
//   //   }
//   // }, []);
//   useEffect(() => {
//     // Get current user email for user-specific storage
//     const user = JSON.parse(localStorage.getItem('user') || 'null');
//     const userEmail = user?.email;
    
//     console.log('🤖 AICoach: Loading state for user:', userEmail);
//     console.log('🤖 AICoach: User object from localStorage:', user);
    
//     const savedState = loadStateFromStorage(userEmail);
//     console.log('🤖 AICoach: Saved state from storage:', savedState);
    
//     if (savedState) {
//       console.log('🤖 AICoach: Found saved state, restoring...', savedState);
//       dispatch({ type: actionTypes.RESTORE_STATE, payload: savedState });
//     } else {
//       console.log('🤖 AICoach: No saved state found, setting welcome message');
      
//       // Set welcome message if no saved state (YOUR EXISTING LOGIC)
//       const welcomeMessage = {
//         id: Date.now(),
//         type: 'ai',
//         content: 'Hello! I\'m your AI Coach for Rapid Learning Cycles. What would you like to know about RLC? Ask me a question in the box at the bottom of the screen or click on one of the following options to get started.'
//       };
//       const conversationId = `conversation-${Date.now()}`;
      
//       console.log('🤖 AICoach: Setting welcome message and conversation ID:', conversationId);
//       dispatch({ type: actionTypes.SET_MESSAGES, payload: [welcomeMessage] });
//       dispatch({ type: actionTypes.SET_CONVERSATION_ID, payload: conversationId });
//     }
//   // }, []);
//   }, [localStorage.getItem('user')]); // Instead of []
export const AICoachProvider = ({ children }) => {
  const [state, dispatch] = useReducer(aiCoachReducer, initialState);
  const { currentUser } = useContext(AuthContext); // ← ADDED: Get currentUser from AuthContext

  useEffect(() => {
    // Get current user email for user-specific storage
    const userEmail = currentUser?.email; // ← CHANGED: Use currentUser instead of localStorage
    
    console.log('🤖 AICoach: Loading state for user:', userEmail);
    console.log('🤖 AICoach: User object from AuthContext:', currentUser); // ← CHANGED: Log from AuthContext
    
    // Skip if no user is logged in
    if (!currentUser) {
      console.log('🤖 AICoach: No user logged in, skipping state load');
      return;
    }
    
    const savedState = loadStateFromStorage(userEmail);
    console.log('🤖 AICoach: Saved state from storage:', savedState);
    
    if (savedState) {
      console.log('🤖 AICoach: Found saved state, restoring...', savedState);
      dispatch({ type: actionTypes.RESTORE_STATE, payload: savedState });
    } else {
      console.log('🤖 AICoach: No saved state found, setting welcome message');
      
      // Set welcome message if no saved state (YOUR EXISTING LOGIC)
      const welcomeMessage = {
        id: Date.now(),
        type: 'ai',
        content: 'Hello! I\'m your AI Coach for Rapid Learning Cycles. What would you like to know about RLC? Ask me a question in the box at the bottom of the screen or click on one of the following options to get started.'
      };
      const conversationId = `conversation-${Date.now()}`;
      
      console.log('🤖 AICoach: Setting welcome message and conversation ID:', conversationId);
      dispatch({ type: actionTypes.SET_MESSAGES, payload: [welcomeMessage] });
      dispatch({ type: actionTypes.SET_CONVERSATION_ID, payload: conversationId });
    }
  }, [currentUser?.email]); // ← CHANGED: Watch for currentUser.email instead of localStorage

  // Save state to localStorage whenever relevant state changes
  // useEffect(() => {
  //   // Only save if we have messages (to avoid saving initial empty state)
  //   if (state.messages.length > 0) {
  //     saveStateToStorage(state);
  //   }
  // }, [state.messages, state.inputText, state.conversationId, state.showSuggestions]);
  useEffect(() => {
    // Only save if we have messages (to avoid saving initial empty state)
    if (state.messages.length > 0) {
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      const userEmail = user?.email;
      saveStateToStorage(state, userEmail);
    }
  }, [state.messages, state.inputText, state.conversationId, state.showSuggestions]);

  // Action creators
  const setMessages = (messages) => {
    dispatch({ type: actionTypes.SET_MESSAGES, payload: messages });
  };

  const addMessage = (message) => {
    dispatch({ type: actionTypes.ADD_MESSAGE, payload: message });
  };

  const setInputText = (text) => {
    dispatch({ type: actionTypes.SET_INPUT_TEXT, payload: text });
  };

  const setLoading = (loading) => {
    dispatch({ type: actionTypes.SET_LOADING, payload: loading });
  };

  const setError = (error) => {
    dispatch({ type: actionTypes.SET_ERROR, payload: error });
  };

  const setConversationId = (id) => {
    dispatch({ type: actionTypes.SET_CONVERSATION_ID, payload: id });
  };

  const setShowSuggestions = (show) => {
    dispatch({ type: actionTypes.SET_SHOW_SUGGESTIONS, payload: show });
  };

//   const clearConversation = () => {
//     // Clear both state and localStorage
//     localStorage.removeItem(STORAGE_KEY);
//     dispatch({ type: actionTypes.CLEAR_CONVERSATION });
//   };
// CLEAR MEMORY CONVERSATION
    // const clearConversation = async () => {
    //     // Store the old conversation ID before clearing
    //     const oldConversationId = state.conversationId;
        
    //     // Clear frontend state and localStorage first
    //     localStorage.removeItem(STORAGE_KEY);
    //     dispatch({ type: actionTypes.CLEAR_CONVERSATION });
        
    //     // Clear backend memory if we had a conversation ID
    //     if (oldConversationId) {
    //     try {
    //         // We'll add this function to the service next
    //         await aiCoachService.clearConversation(oldConversationId);
    //     } catch (error) {
    //         console.warn('Failed to clear backend conversation memory:', error);
    //         // Don't block the UI if backend clearing fails
    //     }
    //     }
    // };
    const clearConversation = async () => {
      // Store the old conversation ID before clearing
      const oldConversationId = state.conversationId;
      
      // Clear frontend state and user-specific localStorage
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      const userEmail = user?.email;
      const storageKey = getStorageKey(userEmail);
      localStorage.removeItem(storageKey);
      dispatch({ type: actionTypes.CLEAR_CONVERSATION });
      
      // Clear backend memory if we had a conversation ID
      if (oldConversationId) {
        try {
          await aiCoachService.clearConversation(oldConversationId);
        } catch (error) {
          console.warn('Failed to clear backend conversation memory:', error);
          // Don't block the UI if backend clearing fails
        }
      }
    };

  const clearCurrentMessage = () => {
    dispatch({ type: actionTypes.CLEAR_CURRENT_MESSAGE });
  };

  // Context value
  const value = {
    // State
    messages: state.messages,
    inputText: state.inputText,
    isLoading: state.isLoading,
    error: state.error,
    conversationId: state.conversationId,
    showSuggestions: state.showSuggestions,
    
    // Actions
    setMessages,
    addMessage,
    setInputText,
    setLoading,
    setError,
    setConversationId,
    setShowSuggestions,
    clearConversation,
    clearCurrentMessage
  };

  return (
    <AICoachContext.Provider value={value}>
      {children}
    </AICoachContext.Provider>
  );
};

// Custom hook to use the context
export const useAICoach = () => {
  const context = useContext(AICoachContext);
  if (!context) {
    throw new Error('useAICoach must be used within an AICoachProvider');
  }
  return context;
};

export default AICoachContext;