import React, { createContext, useContext, useReducer, useEffect } from 'react';

import { AuthContext } from './AuthContext'; // ← ADD THIS IMPORT

// Create the context
const ReportWriterContext = createContext();

const initialState = {
  currentReport: null,
  reportType: 'kg',  // 'kg' or 'kd'
  sessionId: `report-session-${Date.now()}`,
  formData: {
    // Common fields that exist in both report types
    title: '',
    purpose: '',
    description: '',
    what_we_have_done: '',
    what_we_have_learned: '',
    recommendations: '',
    status: 'draft',
    
    // Add these missing fields for both types
    owner: '',
    sequence: '',
    project_name: '',
    
    // Knowledge Gap specific fields
    contributors: '',
    learning_cycle: '',
    kg_number: '',
    
    // Key Decision specific fields
    decision_maker: '',
    integration_event_id: '',
    kd_number: ''
  },
  // Rest of initialState remains the same
  aiSuggestions: [],
  isLoading: false,
  error: null,
  lastSaved: null,
  selectedReport: '',
  chatMessages: [
    {
      role: 'ai',
      content: "Welcome to the RLC report writing assistant. I'm an AI designed to help you complete reports more quickly. I won't write anything for you, but I will help you quickly repackage your thoughts into well-structured reports. You have a few options to get started:\n\n1. You can fill in the report on screen.\n2. You can chat with me and give me instructions to fill it in.\n3. You can use the voice assistant and tell me everything you know about this report; then I will organize the information.\n\nAt the very end you can click \"Evaluate Report\" and I can help guide you on any missing information. You can also check your report against older reports from other projects by clicking \"Check Archive\"."
    }
  ],
  chatInput: '',
  isAiLoading: false,
  sources: [],
  showActionsMenu: false
};

const actionTypes = {
  SET_CURRENT_REPORT: 'SET_CURRENT_REPORT',
  SET_REPORT_TYPE: 'SET_REPORT_TYPE',
  UPDATE_FORM_DATA: 'UPDATE_FORM_DATA',
  ADD_AI_SUGGESTION: 'ADD_AI_SUGGESTION',
  CLEAR_AI_SUGGESTIONS: 'CLEAR_AI_SUGGESTIONS',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  MARK_SAVED: 'MARK_SAVED',
  CLEAR_REPORT: 'CLEAR_REPORT',
  RESTORE_STATE: 'RESTORE_STATE',
  SET_SESSION_ID: 'SET_SESSION_ID', // ← ADD THIS
  CLEAR_CONVERSATION_MEMORY: 'CLEAR_CONVERSATION_MEMORY', // ← ADD THIS
  // Add new action types for conversation memory
  SET_SELECTED_REPORT: 'SET_SELECTED_REPORT',
  SET_CHAT_MESSAGES: 'SET_CHAT_MESSAGES',
  ADD_CHAT_MESSAGE: 'ADD_CHAT_MESSAGE',
  SET_CHAT_INPUT: 'SET_CHAT_INPUT',
  SET_AI_LOADING: 'SET_AI_LOADING',
  SET_SOURCES: 'SET_SOURCES',
  SET_SHOW_ACTIONS_MENU: 'SET_SHOW_ACTIONS_MENU'
};

// Reducer function
const reportWriterReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.SET_CURRENT_REPORT:
      return { ...state, currentReport: action.payload };
    case actionTypes.SET_REPORT_TYPE:
      return { ...state, reportType: action.payload };
    case actionTypes.UPDATE_FORM_DATA:
      return { 
        ...state, 
        formData: { ...state.formData, ...action.payload },
        lastSaved: null // Mark as unsaved when form is updated
      };
    case actionTypes.ADD_AI_SUGGESTION:
      return { 
        ...state, 
        aiSuggestions: [...state.aiSuggestions, action.payload]
      };
    case actionTypes.CLEAR_AI_SUGGESTIONS:
      return { ...state, aiSuggestions: [] };
    case actionTypes.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case actionTypes.SET_ERROR:
      return { ...state, error: action.payload };
    case actionTypes.MARK_SAVED:
      return { ...state, lastSaved: new Date().toISOString() };
    case actionTypes.CLEAR_REPORT:
      return {
        ...initialState,
        reportType: state.reportType, // Maintain selected report type
        sessionId: action.payload?.sessionId || `report-session-${Date.now()}` // Use new session ID
      };
    case actionTypes.RESTORE_STATE:
      return { ...state, ...action.payload };
    // Cases for conversation memory
    case actionTypes.SET_CHAT_MESSAGES:
      return { ...state, chatMessages: action.payload };
    case actionTypes.ADD_CHAT_MESSAGE:
      return { ...state, chatMessages: [...state.chatMessages, action.payload] };
    case actionTypes.SET_CHAT_INPUT:
      return { ...state, chatInput: action.payload };
    case actionTypes.SET_SELECTED_REPORT:
      return { ...state, selectedReport: action.payload };
    case actionTypes.SET_SOURCES:
      return { ...state, sources: action.payload };
    case actionTypes.SET_AI_LOADING:
      return { ...state, isAiLoading: action.payload };
    case actionTypes.SET_SHOW_ACTIONS_MENU:
      return { ...state, showActionsMenu: action.payload };
    case actionTypes.CLEAR_CONVERSATION_MEMORY:
      return {
        ...initialState,
        sessionId: `report-session-${Date.now()}` // Generate new session ID
      };
    case actionTypes.SET_SESSION_ID:
      return { ...state, sessionId: action.payload };
    default:
      return state;
  }
};


// Dynamic storage key based on current user
  const getStorageKey = (userEmail) => {
    return userEmail ? `rlc-reportwriter-state-${userEmail}` : 'rlc-reportwriter-state-guest';
  };

const saveStateToStorage = (state, userEmail) => {
  try {
    const stateToSave = {
      currentReport: state.currentReport,
      reportType: state.reportType,
      formData: state.formData,
      aiSuggestions: state.aiSuggestions,
      // Save conversation memory state
      selectedReport: state.selectedReport,
      chatMessages: state.chatMessages,
      chatInput: state.chatInput,
      sources: state.sources
      // Note: We don't save loading states or UI states like showActionsMenu
    };
    const storageKey = getStorageKey(userEmail);
    localStorage.setItem(storageKey, JSON.stringify(stateToSave));
  } catch (error) {
    console.warn('Failed to save Report Writer state to localStorage:', error);
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
    console.warn('Failed to load Report Writer state from localStorage:', error);
  }
  return null;
};

export const ReportWriterProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reportWriterReducer, initialState);
  const { currentUser } = useContext(AuthContext); // ← ADD THIS LINE

  useEffect(() => {
    const userEmail = currentUser?.email;
    
    console.log('📝 ReportWriter: User changed, loading state for:', userEmail);
    console.log('📝 ReportWriter: Current user object:', currentUser);
    
    if (!currentUser) {
      console.log('📝 ReportWriter: No user logged in, skipping state load');
      return;
    }
    
    const savedState = loadStateFromStorage(userEmail);
    console.log('📝 ReportWriter: Saved state from storage:', savedState);
    
    if (savedState) {
      console.log('📝 ReportWriter: Found saved state, restoring...', savedState);
      dispatch({ type: actionTypes.RESTORE_STATE, payload: savedState });
    } else {
      console.log('📝 ReportWriter: No saved state - resetting to fresh initial state');
      // When no saved state (voluntary logout cleared localStorage), reset to original initial state
      dispatch({ type: actionTypes.RESTORE_STATE, payload: initialState });
    }
  }, [currentUser?.email]);

  useEffect(() => {
    // Only save if we have a user AND actual content beyond the initial welcome message
    if (currentUser?.email && (state.currentReport || state.formData.title || state.chatMessages.length > 1)) {
      console.log('📝 ReportWriter: Saving state to localStorage');
      saveStateToStorage(state, currentUser.email);
    }
  }, [
    currentUser?.email, // Add this dependency
    state.currentReport,
    state.reportType,
    state.formData,
    state.aiSuggestions,
    state.selectedReport,
    state.chatMessages,
    state.chatInput,
    state.sources
  ]);

  // Original action creators
  const setCurrentReport = (report) => {
    dispatch({ type: actionTypes.SET_CURRENT_REPORT, payload: report });
  };

  const setReportType = (type) => {
    dispatch({ type: actionTypes.SET_REPORT_TYPE, payload: type });
  };

  const updateFormData = (data) => {
    dispatch({ type: actionTypes.UPDATE_FORM_DATA, payload: data });
  };

  const addAISuggestion = (suggestion) => {
    dispatch({ type: actionTypes.ADD_AI_SUGGESTION, payload: suggestion });
  };

  const clearAISuggestions = () => {
    dispatch({ type: actionTypes.CLEAR_AI_SUGGESTIONS });
  };

  const setLoading = (loading) => {
    dispatch({ type: actionTypes.SET_LOADING, payload: loading });
  };

  const setError = (error) => {
    dispatch({ type: actionTypes.SET_ERROR, payload: error });
  };

  const markSaved = () => {
    dispatch({ type: actionTypes.MARK_SAVED });
  };

  const clearReport = () => {
    // Generate a new session ID
    const newSessionId = `report-session-${Date.now()}`;
    
    // Clear user-specific localStorage
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const userEmail = user?.email;
    const storageKey = getStorageKey(userEmail);
    localStorage.removeItem(storageKey);
    
    dispatch({ 
      type: actionTypes.CLEAR_REPORT,
      payload: { sessionId: newSessionId }
    });
  };

  const clearConversationMemory = () => {
    console.log('🧹 ReportWriter: Clearing conversation memory');
    
    // Clear user-specific localStorage
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const userEmail = user?.email;
    const storageKey = getStorageKey(userEmail);
    localStorage.removeItem(storageKey);
    
    // Dispatch the clear action
    dispatch({ type: actionTypes.CLEAR_CONVERSATION_MEMORY });
    
    console.log('✅ ReportWriter: Conversation memory cleared');
  };

  // New action creators for conversation memory
  const setSelectedReport = (report) => {
    dispatch({ type: actionTypes.SET_SELECTED_REPORT, payload: report });
  };

  const setChatMessages = (messages) => {
    dispatch({ type: actionTypes.SET_CHAT_MESSAGES, payload: messages });
  };

  const addChatMessage = (message) => {
    dispatch({ type: actionTypes.ADD_CHAT_MESSAGE, payload: message });
  };

  const setChatInput = (input) => {
    dispatch({ type: actionTypes.SET_CHAT_INPUT, payload: input });
  };

  const setAiLoading = (loading) => {
    dispatch({ type: actionTypes.SET_AI_LOADING, payload: loading });
  };

  const setSources = (sources) => {
    dispatch({ type: actionTypes.SET_SOURCES, payload: sources });
  };

  const setShowActionsMenu = (show) => {
    dispatch({ type: actionTypes.SET_SHOW_ACTIONS_MENU, payload: show });
  };

  const setSessionId = (sessionId) => {
    dispatch({ type: actionTypes.SET_SESSION_ID, payload: sessionId });
  };

  // Context value
  const value = {
    // Original state
    currentReport: state.currentReport,
    reportType: state.reportType,
    formData: state.formData,
    aiSuggestions: state.aiSuggestions,
    isLoading: state.isLoading,
    error: state.error,
    lastSaved: state.lastSaved,
    sessionId: state.sessionId,
    
    // New state for conversation memory
    selectedReport: state.selectedReport,
    chatMessages: state.chatMessages,
    chatInput: state.chatInput,
    isAiLoading: state.isAiLoading, 
    sources: state.sources,
    showActionsMenu: state.showActionsMenu,
    
    // Original actions
    setCurrentReport,
    setReportType,
    updateFormData,
    addAISuggestion,
    clearAISuggestions,
    setLoading,
    setError,
    markSaved,
    clearReport,
    
    // New actions for conversation memory
    setSelectedReport,
    setChatMessages,
    addChatMessage,
    setChatInput,
    setAiLoading,
    setSources,
    setShowActionsMenu,
    setSessionId, // ← ADD THIS
    clearConversationMemory // ← ADD THIS
  };

  return (
    <ReportWriterContext.Provider value={value}>
      {children}
    </ReportWriterContext.Provider>
  );
};

// Custom hook to use the context
export const useReportWriter = () => {
  const context = useContext(ReportWriterContext);
  if (!context) {
    throw new Error('useReportWriter must be used within a ReportWriterProvider');
  }
  return context;
};

export default ReportWriterContext;