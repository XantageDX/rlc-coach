import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Create the context
const ReportWriterContext = createContext();

// Define the initial state
const initialState = {
  currentReport: null,
  reportType: 'kg',  // 'kg' or 'kd'
  sessionId: `report-session-${Date.now()}`, // Add this line
  formData: {
    title: '',
    purpose: '',
    description: '',
    what_we_have_done: '',
    what_we_have_learned: '',
    recommendations: '',
    status: 'draft'
  },
  aiSuggestions: [],
  isLoading: false,
  error: null,
  lastSaved: null
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
  RESTORE_STATE: 'RESTORE_STATE'
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
    default:
      return state;
  }
};

// localStorage key
const STORAGE_KEY = 'rlc-reportwriter-state';

// Helper function to save state to localStorage
const saveStateToStorage = (state) => {
  try {
    const stateToSave = {
      currentReport: state.currentReport,
      reportType: state.reportType,
      formData: state.formData,
      aiSuggestions: state.aiSuggestions
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  } catch (error) {
    console.warn('Failed to save Report Writer state to localStorage:', error);
  }
};

// Helper function to load state from localStorage
const loadStateFromStorage = () => {
  try {
    const savedState = localStorage.getItem(STORAGE_KEY);
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
  useEffect(() => {
    const savedState = loadStateFromStorage();
    if (savedState) {
      dispatch({ type: actionTypes.RESTORE_STATE, payload: savedState });
    }
  }, []);

  // Save state to localStorage whenever relevant state changes
  useEffect(() => {
    saveStateToStorage(state);
  }, [state.currentReport, state.reportType, state.formData, state.aiSuggestions]);

  // Action creators
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
    
    // Clear both state and localStorage
    localStorage.removeItem(STORAGE_KEY);
    dispatch({ 
      type: actionTypes.CLEAR_REPORT,
      payload: { sessionId: newSessionId }
    });
  };

  // Context value
  const value = {
    // State
    currentReport: state.currentReport,
    reportType: state.reportType,
    formData: state.formData,
    aiSuggestions: state.aiSuggestions,
    isLoading: state.isLoading,
    error: state.error,
    lastSaved: state.lastSaved,
    
    // Actions
    setCurrentReport,
    setReportType,
    updateFormData,
    addAISuggestion,
    clearAISuggestions,
    setLoading,
    setError,
    markSaved,
    clearReport
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