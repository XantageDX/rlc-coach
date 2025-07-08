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
        showSuggestions: true,  // ← EXPLICITLY set this to true
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

// Dynamic storage key based on current user
const getStorageKey = (userEmail) => {
  return userEmail ? `rlc-aicoach-state-${userEmail}` : 'rlc-aicoach-state-guest';
};

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

export const AICoachProvider = ({ children }) => {
  const [state, dispatch] = useReducer(aiCoachReducer, initialState);
  const { currentUser } = useContext(AuthContext); // ← ADDED: Get currentUser from AuthContext

  useEffect(() => {
    const userEmail = currentUser?.email;
    
    // Try to load saved state
    const savedState = loadStateFromStorage(userEmail);
    
    if (savedState && savedState.messages && savedState.messages.length > 1) {
      // Only restore if we have a real conversation (more than just welcome message)
      console.log('🔄 AICoach: Restoring saved conversation for user:', userEmail);
      dispatch({ type: actionTypes.RESTORE_STATE, payload: savedState });
    } else {
      // If no saved state or only welcome message, create fresh state
      console.log('🆕 AICoach: Creating fresh state for user:', userEmail);
      const welcomeMessage = {
        role: 'assistant',
        content: 'Hello! I\'m your AI Coach for Rapid Learning Cycles. What would you like to know about RLC? Ask me a question in the box at the bottom of the screen or click on one of the following options to get started.'
      };
      const conversationId = `conversation-${Date.now()}`;
      
      console.log('🤖 AICoach: Setting welcome message with suggestions enabled');
      dispatch({ type: actionTypes.SET_MESSAGES, payload: [welcomeMessage] });
      dispatch({ type: actionTypes.SET_CONVERSATION_ID, payload: conversationId });
      dispatch({ type: actionTypes.SET_SHOW_SUGGESTIONS, payload: true }); // ← EXPLICITLY set suggestions
    }
  }, [currentUser?.email]);

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

const clearConversation = async () => {
      // Store the old conversation ID before clearing
      const oldConversationId = state.conversationId;
      
      console.log('🧹 AICoach: Clearing conversation, suggestions should show after this');
      
      // Clear frontend state and user-specific localStorage
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      const userEmail = user?.email;
      const storageKey = getStorageKey(userEmail);
      localStorage.removeItem(storageKey);
      
      // Dispatch the clear action
      dispatch({ type: actionTypes.CLEAR_CONVERSATION });
      
      // Force suggestions to show after clearing
      setTimeout(() => {
        console.log('🔄 AICoach: Force-enabling suggestions after clear');
        dispatch({ type: actionTypes.SET_SHOW_SUGGESTIONS, payload: true });
      }, 100);
      
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