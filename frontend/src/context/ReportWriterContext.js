import React, { createContext, useContext, useReducer, useEffect } from 'react';

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

// Define action types
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
  // New action types for conversation memory
  SET_CHAT_MESSAGES: 'SET_CHAT_MESSAGES',
  ADD_CHAT_MESSAGE: 'ADD_CHAT_MESSAGE',
  SET_CHAT_INPUT: 'SET_CHAT_INPUT',
  SET_SELECTED_REPORT: 'SET_SELECTED_REPORT',
  SET_SOURCES: 'SET_SOURCES',
  SET_AI_LOADING: 'SET_AI_LOADING',
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
    default:
      return state;
  }
};

// localStorage key
// const STORAGE_KEY = 'rlc-reportwriter-state';

// Dynamic storage key based on current user
  const getStorageKey = (userEmail) => {
    return userEmail ? `rlc-reportwriter-state-${userEmail}` : 'rlc-reportwriter-state-guest';
  };

// Helper function to save state to localStorage
// const saveStateToStorage = (state) => {
//   try {
//     const stateToSave = {
//       currentReport: state.currentReport,
//       reportType: state.reportType,
//       formData: state.formData,
//       aiSuggestions: state.aiSuggestions,
//       // Save conversation memory state
//       selectedReport: state.selectedReport,
//       chatMessages: state.chatMessages,
//       chatInput: state.chatInput,
//       sources: state.sources
//       // Note: We don't save loading states or UI states like showActionsMenu
//     };
//     localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
//   } catch (error) {
//     console.warn('Failed to save Report Writer state to localStorage:', error);
//   }
// };
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

// Helper function to load state from localStorage
// const loadStateFromStorage = () => {
//   try {
//     const savedState = localStorage.getItem(STORAGE_KEY);
//     if (savedState) {
//       return JSON.parse(savedState);
//     }
//   } catch (error) {
//     console.warn('Failed to load Report Writer state from localStorage:', error);
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
    console.warn('Failed to load Report Writer state from localStorage:', error);
  }
  return null;
};

// Provider component
export const ReportWriterProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reportWriterReducer, initialState);

  // Load state from localStorage on initialization
  // useEffect(() => {
  //   const savedState = loadStateFromStorage();
  //   if (savedState) {
  //     dispatch({ type: actionTypes.RESTORE_STATE, payload: savedState });
  //   }
  // }, []);
  useEffect(() => {
    // Get current user email for user-specific storage
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const userEmail = user?.email;
    
    const savedState = loadStateFromStorage(userEmail);
    if (savedState) {
      dispatch({ type: actionTypes.RESTORE_STATE, payload: savedState });
    }
  }, []);

  // Save state to localStorage whenever relevant state changes
  // useEffect(() => {
  //   saveStateToStorage(state);
  // }, [
  //   state.currentReport,
  //   state.reportType,
  //   state.formData,
  //   state.aiSuggestions,
  //   // Add conversation memory dependencies
  //   state.selectedReport,
  //   state.chatMessages,
  //   state.chatInput,
  //   state.sources
  // ]);
  useEffect(() => {
    // Only save if we have actual content (avoid saving initial empty state)
    if (state.currentReport || state.formData.title || state.chatMessages.length > 1) {
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      const userEmail = user?.email;
      saveStateToStorage(state, userEmail);
    }
  }, [
    state.currentReport,
    state.reportType,
    state.formData,
    state.aiSuggestions,
    // Add conversation memory dependencies
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

  // const clearReport = () => {
  //   // Generate a new session ID
  //   const newSessionId = `report-session-${Date.now()}`;
    
  //   // Clear both state and localStorage
  //   localStorage.removeItem(STORAGE_KEY);
  //   dispatch({ 
  //     type: actionTypes.CLEAR_REPORT,
  //     payload: { sessionId: newSessionId }
  //   });
  // };
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
    setShowActionsMenu
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