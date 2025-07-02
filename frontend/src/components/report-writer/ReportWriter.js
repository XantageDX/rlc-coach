import React, { useState, useRef, useEffect, useContext } from 'react';
import './../../styles/report-writer.css';
import reportAiService from '../../services/reportAiService';
import pptxgen from 'pptxgenjs';
import jsPDF from 'jspdf';
import axios from 'axios';
// import archiveService from '../../services/archiveService';
// REMOVED: import { useModel } from '../../context/ModelContext';
import { useReportWriter } from '../../context/ReportWriterContext';

import { AuthContext } from '../../context/AuthContext';
import { USER_ROLES } from '../../utils/rolePermissions';

// FEEDBACK
import FeedbackButtons from '../common/FeedbackButtons';
import FeedbackModal from '../common/FeedbackModal';
import feedbackService from '../../services/feedbackService';

import MarkdownRenderer from '../common/MarkdownRenderer';

const API_URL = 'https://api.spark.rapidlearningcycles.com';

const ReportWriter = () => {
  // REMOVED: const { selectedModel } = useModel();
  const messagesEndRef = useRef(null);
  
  // Get everything from the context
  const {
    currentReport,
    reportType,
    formData,
    sessionId,
    clearReport,
    
    // State from context
    selectedReport,
    chatMessages,
    chatInput,
    isAiLoading,
    sources,
    showActionsMenu,
    
    // Methods from context
    setSelectedReport,
    setChatMessages,
    addChatMessage,
    setChatInput,
    setAiLoading,
    setSources,
    setShowActionsMenu,
    
    // Add this line to include updateFormData
    updateFormData
  } = useReportWriter();
//

// In your ReportWriter component, add these helper functions:
const { currentUser } = useContext(AuthContext);

// Helper function to determine which actions are available to the current user
const getAvailableActions = () => {
  const isSuperAdmin = currentUser?.role === USER_ROLES.SUPER_ADMIN;
  
  return {
    checkArchive: isSuperAdmin,      // Only super_admin
    evaluateReport: true,            // All roles
    exportPowerPoint: true,          // All roles
    exportPDF: true,                 // All roles
    clearSession: true               // All roles
  };
};

const availableActions = getAvailableActions();

const [isTyping, setIsTyping] = useState(false);

  // FEEDBACK - Add feedback state variables
  const [feedbackMessageId, setFeedbackMessageId] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Handle feedback button click
  const handleFeedbackSubmit = (messageId, rating) => {
    setFeedbackMessageId(messageId);
    setFeedbackRating(rating);
    setShowFeedbackModal(true);
  };

  // Handle feedback modal submit
  const handleFeedbackModalSubmit = async (feedbackText) => {
    try {
      // Find the message that feedback is for
      const message = chatMessages.find((msg, idx) => idx === feedbackMessageId);
      if (!message) return;
      
      // Get the previous user message if this is an AI response
      const previousUserMessage = feedbackMessageId > 0 && message.role === 'ai' 
        ? chatMessages[feedbackMessageId - 1]?.content || ''
        : '';
      
      await feedbackService.submitFeedback({
        component: 'ReportWriter',
        // REMOVED: modelId: selectedModel,
        modelId: 'llama-3.3-70b', // Fixed model since backend uses standardized model
        conversationId: sessionId || 'default-session',
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

  // Auto-scroll to bottom of chat when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Keep your existing scrollToBottom useEffect
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // Add click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showActionsMenu && !event.target.closest('.actions-dropdown')) {
        setShowActionsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActionsMenu]);

  // Add this new useEffect for voice recognition cleanup
  useEffect(() => {
    return () => {
      // Reset any microphone button styling when component unmounts
      const voiceBtn = document.querySelector('.voice-btn svg');
      if (voiceBtn) {
        voiceBtn.style.fill = '#8BB5E8';
      }
    };
  }, []);
  
const handleReportSelect = (e) => {
  const newReportType = e.target.value;
  
  // Only reset if the selection has changed (not on initial selection)
  if (selectedReport && newReportType !== selectedReport) {
    // Clear all form fields by resetting the form
    const formContainer = document.getElementById('report-form-container');
    if (formContainer) {
      const inputs = formContainer.querySelectorAll('input, textarea, select');
      inputs.forEach(input => {
        input.value = '';
      });
      
      // For selects, reset to first option
      const selects = formContainer.querySelectorAll('select');
      selects.forEach(select => {
        if (select.options.length > 0) {
          select.selectedIndex = 0;
        }
      });
    }
    
    // Reset chat messages to just the welcome message
    setChatMessages([
      {
        role: 'ai',
        content: "Welcome to the RLC report writing assistant. I'm an AI designed to help you complete reports more quickly. I won't write anything for you, but I will help you quickly repackage your thoughts into well-structured reports. You have a few options to get started:\n\n1. You can fill in the report on screen.\n2. You can chat with me and give me instructions to fill it in.\n3. You can use the voice assistant and tell me everything you know about this report; then I will organize the information.\n\nAt the very end you can click \"Evaluate Report\" and I can help guide you on any missing information. You can also check your report against older reports from other projects by clicking \"Check Archive\"."
      },
      {
        role: 'ai',
        content: `You've switched to a new ${newReportType === 'knowledge_gap' ? 'Knowledge Gap' : 'Key Decision'} report. All previous information has been cleared.`
      }
    ]);
  }
  
  // Update the selected report type
  setSelectedReport(newReportType);
};
  
  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return;
    
    // Add user message to chat
    const userMessage = { role: 'user', content: chatInput };
    addChatMessage(userMessage); // Use context method instead of setChatMessages
    
    // Clear input and show loading state
    setChatInput('');
    setIsTyping(false); // Reset typing state when message is sent
    setAiLoading(true); // Use context method instead of setIsAiLoading
    
    try {
      // Get report context
      const reportContext = getReportFieldValues();
      
      let response;
      
      // Use the appropriate service based on report type
      if (selectedReport === 'knowledge_gap') {
        response = await reportAiService.processKGMessage(
          userMessage.content,
          null, // No report ID since we're not using the database
          reportContext,
          // REMOVED: selectedModel,
          sessionId // Make sure you're passing the sessionId here
        );
      } else if (selectedReport === 'key_decision') {
        response = await reportAiService.processKDMessage(
          userMessage.content,
          null, // No report ID
          reportContext,
          // REMOVED: selectedModel,
          sessionId // Make sure you're passing the sessionId here
        );
      } else {
        throw new Error("Please select a report type first.");
      }
      
      // Add AI response
      addChatMessage({
        role: 'ai',
        content: response.answer || response.error || "Sorry, I couldn't process your request."
      });
    } catch (err) {
      console.error('Error from AI:', err);
      addChatMessage({
        role: 'ai',
        content: err.message || "Sorry, there was an error processing your request. Please try again."
      });
    } finally {
      setAiLoading(false); // Use context method
    }
  };
  
// Voice input handler with updated UX flow
const startVoiceInput = () => {
  // Feature detection for Web Speech API
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    // Alert user if browser doesn't support the feature
    alert("Sorry, voice recognition isn't supported in your browser. For best results, use Chrome or Edge.");
    return;
  }

  // Store reference to paths in microphone SVG
  const micTopPath = document.querySelector('.voice-btn svg path#mic-top');
  const micBottomPath = document.querySelector('.voice-btn svg path#mic-bottom');
  const voiceBtn = document.querySelector('.voice-btn');
  
  // Check if we're already recording
  const isRecording = voiceBtn.getAttribute('data-recording') === 'true';
  
  if (isRecording) {
    // If we're already recording, stop it
    console.log('Stopping recording');
    window.speechRecognitionInstance?.stop();
    return;
  }
  
  // Create a new speech recognition instance
  const recognition = new SpeechRecognition();
  
  // Store the recognition instance globally so we can stop it later
  window.speechRecognitionInstance = recognition;
  
  // Configure the recognition
  recognition.lang = 'en-US';
  recognition.continuous = true;
  recognition.interimResults = true;
  
  // Mark button as recording
  voiceBtn.setAttribute('data-recording', 'true');
  
  // Change microphone color to red
  if (micTopPath && micBottomPath) {
    micTopPath.setAttribute('fill', '#ff4c4c');
    micBottomPath.setAttribute('fill', '#ff4c4c');
    console.log('Microphone color changed to red');
  }
  
  // Add message showing recording has started
  setChatMessages(prev => [...prev, {
    role: 'ai',
    content: "🎤 I'm listening... Speak clearly and I'll transcribe your message. Click the microphone button again to stop recording."
  }]);
  
  // Variable to store transcript
  let finalTranscript = '';
  
  // Event handler for results
  recognition.onresult = (event) => {
    console.log('Speech recognition result received', event);
    let interimTranscript = '';
    
    // Process the results
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      
      if (event.results[i].isFinal) {
        finalTranscript += transcript + ' ';
      } else {
        interimTranscript += transcript;
      }
    }
    
    // Update the chat input with the current transcript
    setChatInput(finalTranscript + interimTranscript);
  };
  
  // Handle errors
  recognition.onerror = (event) => {
    console.error('Speech recognition error', event.error);
    
    // Reset the voice button color and state
    resetRecordingState();
    
    if (event.error === 'not-allowed') {
      setChatMessages(prev => [...prev, {
        role: 'ai',
        content: "Microphone access was denied. Please allow microphone access and try again."
      }]);
    } else {
      setChatMessages(prev => [...prev, {
        role: 'ai',
        content: `Speech recognition error: ${event.error}. Please try again.`
      }]);
    }
  };
  
  // Handle the end of speech recognition
  recognition.onend = () => {
    console.log('Speech recognition ended');
    
    // Reset the voice button color and state
    resetRecordingState();
    
    // Only submit if we have a transcript
    // if (finalTranscript.trim()) {
    //   setChatInput(finalTranscript.trim());
      
    //   // Small delay to ensure the UI updates before submitting
    //   setTimeout(() => {
    //     handleChatSubmit();
    //   }, 300);
    // }
    // Only submit if we have a transcript
    if (finalTranscript.trim()) {
      setChatInput(finalTranscript.trim());
      setIsTyping(true); // Show send button after voice input
      
      // Small delay to ensure the UI updates before submitting
      setTimeout(() => {
        handleChatSubmit();
      }, 300);
    }
  };
  
  // Function to reset recording state
  const resetRecordingState = () => {
    // Reset the voice button color
    if (micTopPath && micBottomPath) {
      micTopPath.setAttribute('fill', '#8BB5E8');
      micBottomPath.setAttribute('fill', '#8BB5E8');
    }
    
    // Reset the recording state
    voiceBtn.setAttribute('data-recording', 'false');
    
    // Clear the global instance
    window.speechRecognitionInstance = null;
  };
  
  // Start recognition
  try {
    recognition.start();
    console.log('Speech recognition started');
  } catch (err) {
    console.error('Error starting speech recognition:', err);
    resetRecordingState();
  }
};
  

  const renderKeyDecisionReport = () => {
    return (
      <div className="template-grid" style={{
        gridTemplateAreas: `
          'bannerLeft  bannerRight'
          'kdBox       learned'
          'purpose     learned'
          'doneBox     recBox'
        `
      }}>
        <div className="banner-left banner-left-kd" style={{ gridArea: 'bannerLeft' }}>
          <strong>Key Decision:</strong><br/>
          <input
            type="text"
            className="field-kd-title"
            value={formData.title || ''}
            onChange={(e) => updateFormData({title: e.target.value})}
            style={{width:'80%', marginBottom: '5px'}}
          /><br/>
          Owner: <input
            type="text"
            className="field-kd-owner"
            value={formData.owner || ''}
            onChange={(e) => updateFormData({owner: e.target.value})}
            style={{width:'120px'}}
          /><br/>
          Decision Maker: <input
            type="text"
            className="field-kd-decision-maker"
            value={formData.decision_maker || ''}
            onChange={(e) => updateFormData({decision_maker: e.target.value})}
            style={{width:'120px'}}
          /><br/>
          Integration Event: <input
            type="text"
            className="field-kd-integration-event-id"
            value={formData.integration_event_id || ''}
            onChange={(e) => updateFormData({integration_event_id: e.target.value})}
            style={{width:'120px'}}
          /><br/>
          Sequence: <input
            type="text"
            className="field-kd-sequence"
            value={formData.sequence || ''}
            onChange={(e) => updateFormData({sequence: e.target.value})}
            style={{width:'60px'}}
          />
        </div>
        <div className="banner-right banner-right-kd" style={{ gridArea: 'bannerRight' }}>
          <strong>Project Name </strong><br/>
          <input
            type="text"
            className="field-kd-project-name"
            value={formData.project_name || ''}
            onChange={(e) => updateFormData({project_name: e.target.value})}
            style={{width:'90%', height:'3px'}}
          /><br/>
          Key Decision: <input
            type="text"
            className="field-kd-number"
            value={formData.kd_number || ''}
            onChange={(e) => updateFormData({kd_number: e.target.value})}
            style={{width:'60px', height:'3px'}}
          /><br/>
          Status:
          <select 
            className="field-kd-status" 
            value={formData.status || 'draft'}
            onChange={(e) => updateFormData({status: e.target.value})}
            style={{width: '100px', marginTop: '4px'}}
          >
            <option value="draft">Draft</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div className="template-box" style={{ gridArea: 'kdBox' }}>
          <h4>The Key Decision</h4>
          <textarea
            className="field-kd-description"
            value={formData.description || ''}
            onChange={(e) => updateFormData({description: e.target.value})}
          ></textarea>
        </div>
        <div className="template-box" style={{ gridArea: 'purpose' }}>
          <h4>The Purpose</h4>
          <textarea
            className="field-kd-purpose"
            value={formData.purpose || ''}
            onChange={(e) => updateFormData({purpose: e.target.value})}
          ></textarea>
        </div>
        <div className="template-box template-large" style={{ gridArea: 'learned' }}>
          <h4>What We Have Learned – summary of all Knowledge Gaps</h4>
          <textarea
            className="field-kd-what-we-have-learned"
            value={formData.what_we_have_learned || ''}
            onChange={(e) => updateFormData({what_we_have_learned: e.target.value})}
            style={{height:'120px'}}
          ></textarea>
        </div>
        <div className="template-box template-large" style={{ gridArea: 'doneBox' }}>
          <h4>What We Have Done</h4>
          <textarea
            className="field-kd-what-we-have-done"
            value={formData.what_we_have_done || ''}
            onChange={(e) => updateFormData({what_we_have_done: e.target.value})}
            style={{height:'120px'}}
          ></textarea>
        </div>
        <div className="template-box template-large" style={{ gridArea: 'recBox' }}>
          <h4>What We Recommend / What We Have Decided</h4>
          <textarea
            className="field-kd-recommendations"
            value={formData.recommendations || ''}
            onChange={(e) => updateFormData({recommendations: e.target.value})}
            style={{height:'80px'}}
          ></textarea>
        </div>
      </div>
    );
  };
  

  const renderKnowledgeGapReport = () => {
    return (
      <div className="template-grid" style={{
        gridTemplateAreas: `
          'bannerLeft bannerRight'
          'question   learned'
          'purpose    learned'
          'doneBox    recBox'
        `
      }}>
        <div className="banner-left" style={{ gridArea: 'bannerLeft' }}>
          <strong>Knowledge Gap: </strong>
          <input
            type="text"
            className="field-title"
            value={formData.title || ''}
            onChange={(e) => updateFormData({title: e.target.value})}
            style={{width:'80%'}}
          /><br/>
          Owner: <input
            type="text"
            className="field-owner"
            value={formData.owner || ''}
            onChange={(e) => updateFormData({owner: e.target.value})}
            style={{width:'150px'}}
          /><br/>
          Contributors: <input
            type="text"
            className="field-contributors"
            value={formData.contributors || ''}
            onChange={(e) => updateFormData({contributors: e.target.value})}
            style={{width:'200px'}}
          /><br/>
          Learning Cycle: <input
            type="text"
            className="field-learning_cycle"
            value={formData.learning_cycle || ''}
            onChange={(e) => updateFormData({learning_cycle: e.target.value})}
            style={{width:'100px'}}
          /><br/>
          Sequence: <input
            type="text"
            className="field-sequence"
            value={formData.sequence || ''}
            onChange={(e) => updateFormData({sequence: e.target.value})}
            style={{width:'60px'}}
          />
        </div>
        <div className="banner-right" style={{ gridArea: 'bannerRight' }}>
          <strong>Project Name: </strong><br/>
          <input
            type="text"
            className="field-project-name"
            value={formData.project_name || ''}
            onChange={(e) => updateFormData({project_name: e.target.value})}
            style={{width:'90%', height:'3px'}}
          /><br/>
          Knowledge Gap <input
            type="text"
            className="field-kg-number"
            value={formData.kg_number || ''}
            onChange={(e) => updateFormData({kg_number: e.target.value})}
            style={{width:'60px', height:'3px'}}
          /><br/>
          Status:
          <select 
            className="field-status" 
            value={formData.status || 'in_progress'}
            onChange={(e) => updateFormData({status: e.target.value})}
            style={{width: '100px', marginTop: '4px'}}
          >
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="draft">Draft</option>
          </select>
        </div>
        <div className="template-box" style={{ gridArea: 'question' }}>
          <h4>The Question to Answer</h4>
          <textarea
            className="field-description"
            value={formData.description || ''}
            onChange={(e) => updateFormData({description: e.target.value})}
            style={{height:'80px'}}
          ></textarea>
        </div>
        <div className="template-box template-large" style={{ gridArea: 'learned' }}>
          <h4>What We Have Learned</h4>
          <textarea
            className="field-what_we_have_learned"
            value={formData.what_we_have_learned || ''}
            onChange={(e) => updateFormData({what_we_have_learned: e.target.value})}
            style={{height:'120px'}}
          ></textarea>
        </div>
        <div className="template-box" style={{ gridArea: 'purpose' }}>
          <h4>The Purpose</h4>
          <textarea
            className="field-purpose"
            value={formData.purpose || ''}
            onChange={(e) => updateFormData({purpose: e.target.value})}
            style={{height:'120px'}}
          ></textarea>
        </div>
        <div className="template-box template-large" style={{ gridArea: 'doneBox' }}>
          <h4>What We Have Done</h4>
          <textarea
            className="field-what_we_have_done"
            value={formData.what_we_have_done || ''}
            onChange={(e) => updateFormData({what_we_have_done: e.target.value})}
            style={{height:'120px'}}
          ></textarea>
        </div>
        <div className="template-box template-large" style={{ gridArea: 'recBox' }}>
          <h4>Recommendations and Next Steps</h4>
          <textarea
            className="field-recommendations"
            value={formData.recommendations || ''}
            onChange={(e) => updateFormData({recommendations: e.target.value})}
            style={{height:'80px'}}
          ></textarea>
        </div>
      </div>
    );
  };

  const renderSelectedReport = () => {
    if (!selectedReport) {
      return (
        <div className="select-report-prompt">
          <div>
            <i className="fas fa-arrow-up" style={{ marginRight: '10px' }}></i>
            Please select a report from the dropdown above
          </div>
          <div style={{ fontSize: '0.9rem', marginTop: '10px', fontWeight: 'normal' }}>
            This is required to continue
          </div>
        </div>
      );
    }
    
    if (selectedReport === 'key_decision') {
      return renderKeyDecisionReport();
    } else if (selectedReport === 'knowledge_gap') {
      return renderKnowledgeGapReport();
    }
    
    return null;
  };
  

  // Report action functions
  const exportPowerPoint = () => {
    if (!selectedReport) {
      alert('Please select a report type first.');
      return;
    }
    
    // Create a new PowerPoint presentation
    const pptx = new pptxgen();
    
    // Get all field values
    const fields = getReportFieldValues();
    
    // Set presentation properties
    pptx.layout = 'LAYOUT_16x9';
    
    // Create a single slide that mimics the report layout
    const slide = pptx.addSlide();
    
    // Margin settings - using minimal margins to maximize content area
    const margin = 0.1; // 0.1 inches = about 5px
    const width = 9.8; // Total usable width (10 inches - 2*margin)
    const height = 5.3; // Total usable height (5.5 inches - 2*margin)
    
    // Calculate dimensions and positions for the grid layout
    const leftColWidth = width * 0.48;
    const rightColWidth = width * 0.48;
    const gapBetween = width * 0.02;
    const bannerHeight = height * 0.2;
    const contentHeight = (height - bannerHeight) / 3;
    
    // Text size - reduce by half from default
    const titleSize = 9; // Title font size
    const contentSize = 8; // Content font size
    
    // Set up the grid layout similar to the HTML template
    if (selectedReport === 'knowledge_gap') {
      // Left banner
      slide.addShape('rect', {
        x: margin, 
        y: margin, 
        w: leftColWidth, 
        h: bannerHeight,
        fill: { color: '#fffa97' },
        line: { color: '#999999', width: 0.5 }
      });
      
      slide.addText([
        { text: `Knowledge Gap: ${fields.title || 'Untitled'}`, options: { bold: true, fontSize: titleSize, color: '000000' } },
        { text: `\nOwner: ${fields.owner || 'N/A'}`, options: { fontSize: contentSize, color: '000000' } },
        { text: `\nContributors: ${fields.contributors || 'N/A'}`, options: { fontSize: contentSize, color: '000000' } },
        { text: `\nLearning Cycle: ${fields.learning_cycle || 'N/A'}`, options: { fontSize: contentSize, color: '000000' } },
        { text: `\nSequence: ${fields.sequence || 'N/A'}`, options: { fontSize: contentSize, color: '000000' } }
      ], {
        x: margin + 0.1, 
        y: margin + 0.1, 
        w: leftColWidth - 0.2, 
        h: bannerHeight - 0.2,
        align: 'left',  // Horizontal alignment
        valign: 'top'   // Vertical alignment 
      });
      
      // Right banner
      slide.addShape('rect', {
        x: margin + leftColWidth + gapBetween, 
        y: margin, 
        w: rightColWidth, 
        h: bannerHeight,
        fill: { color: '#fffa97' },
        line: { color: '#999999', width: 0.5 }
      });
      
      slide.addText([
        { text: `Project Name: ${fields.project_name || 'Unnamed Project'}`, options: { bold: true, fontSize: titleSize, color: '000000' } },
        { text: `\nKnowledge Gap #${fields.kg_number || 'N/A'}`, options: { fontSize: contentSize, color: '000000' } },
        { text: `\nStatus: ${fields.status || 'In Progress'}`, options: { fontSize: contentSize, color: '000000' } }
      ], {
        x: margin + leftColWidth + gapBetween + 0.1, 
        y: margin + 0.1, 
        w: rightColWidth - 0.2, 
        h: bannerHeight - 0.2,
        align: 'left',  // Horizontal alignment
        valign: 'top'   // Vertical alignment 
      });
      
      // Question section (left top)
      slide.addShape('rect', {
        x: margin, 
        y: margin + bannerHeight + 0.05, 
        w: leftColWidth, 
        h: contentHeight,
        fill: { color: '#ffffff' },
        line: { color: '#999999', width: 0.5 }
      });
      
      slide.addText([
        { text: 'The Question to Answer', options: { bold: true, fontSize: titleSize, color: '000000' } },
        ...(fields.description ? [{ text: `\n${fields.description}`, options: { fontSize: contentSize, color: '000000' } }] : [])
      ], {
        x: margin + 0.1, 
        y: margin + bannerHeight + 0.15, 
        w: leftColWidth - 0.2, 
        h: contentHeight - 0.2,
        align: 'left',  // Horizontal alignment
        valign: 'top'   // Vertical alignment 
      });
      
      // What We Have Learned (right column)
      slide.addShape('rect', {
        x: margin + leftColWidth + gapBetween, 
        y: margin + bannerHeight + 0.05, 
        w: rightColWidth, 
        h: contentHeight * 2,
        fill: { color: '#ffffff' },
        line: { color: '#999999', width: 0.5 }
      });
      
      slide.addText([
        { text: 'What We Have Learned', options: { bold: true, fontSize: titleSize, color: '000000' } },
        ...(fields.what_we_have_learned ? [{ text: `\n${fields.what_we_have_learned}`, options: { fontSize: contentSize, color: '000000' } }] : [])
      ], {
        x: margin + leftColWidth + gapBetween + 0.1, 
        y: margin + bannerHeight + 0.15, 
        w: rightColWidth - 0.2, 
        h: contentHeight * 2 - 0.2,
        align: 'left',  // Horizontal alignment
        valign: 'top'   // Vertical alignment 
      });
      
      // Purpose section (left middle)
      slide.addShape('rect', {
        x: margin, 
        y: margin + bannerHeight + contentHeight + 0.1, 
        w: leftColWidth, 
        h: contentHeight,
        fill: { color: '#ffffff' },
        line: { color: '#999999', width: 0.5 }
      });
      
      slide.addText([
        { text: 'The Purpose', options: { bold: true, fontSize: titleSize, color: '000000' } },
        ...(fields.purpose ? [{ text: `\n${fields.purpose}`, options: { fontSize: contentSize, color: '000000' } }] : [])
      ], {
        x: margin + 0.1, 
        y: margin + bannerHeight + contentHeight + 0.2, 
        w: leftColWidth - 0.2, 
        h: contentHeight - 0.2,
        align: 'left',  // Horizontal alignment
        valign: 'top'   // Vertical alignment 
      });
      
      // What We Have Done (bottom left)
      slide.addShape('rect', {
        x: margin, 
        y: margin + bannerHeight + contentHeight * 2 + 0.15, 
        w: leftColWidth, 
        h: contentHeight,
        fill: { color: '#ffffff' },
        line: { color: '#999999', width: 0.5 }
      });
      
      slide.addText([
        { text: 'What We Have Done', options: { bold: true, fontSize: titleSize, color: '000000' } },
        ...(fields.what_we_have_done ? [{ text: `\n${fields.what_we_have_done}`, options: { fontSize: contentSize, color: '000000' } }] : [])
      ], {
        x: margin + 0.1, 
        y: margin + bannerHeight + contentHeight * 2 + 0.25, 
        w: leftColWidth - 0.2, 
        h: contentHeight - 0.2,
        align: 'left',  // Horizontal alignment
        valign: 'top'   // Vertical alignment 
      });
      
      // Recommendations section (bottom right)
      slide.addShape('rect', {
        x: margin + leftColWidth + gapBetween, 
        y: margin + bannerHeight + contentHeight * 2 + 0.15, 
        w: rightColWidth, 
        h: contentHeight,
        fill: { color: '#ffffff' },
        line: { color: '#999999', width: 0.5 }
      });
      
      slide.addText([
        { text: 'Recommendations and Next Steps', options: { bold: true, fontSize: titleSize, color: '000000' } },
        ...(fields.recommendations ? [{ text: `\n${fields.recommendations}`, options: { fontSize: contentSize, color: '000000' } }] : [])
      ], {
        x: margin + leftColWidth + gapBetween + 0.1, 
        y: margin + bannerHeight + contentHeight * 2 + 0.25, 
        w: rightColWidth - 0.2, 
        h: contentHeight - 0.2,
        align: 'left',  // Horizontal alignment
        valign: 'top'   // Vertical alignment 
      });
      
    } else if (selectedReport === 'key_decision') {
      // Left banner
      slide.addShape('rect', {
        x: margin, 
        y: margin, 
        w: leftColWidth, 
        h: bannerHeight,
        fill: { color: '#b3ff9f' },
        line: { color: '#999999', width: 0.5 }
      });
      
      slide.addText([
        { text: `Key Decision: ${fields.title || 'Untitled'}`, options: { bold: true, fontSize: titleSize, color: '000000' } },
        { text: `\nOwner: ${fields.owner || 'N/A'}`, options: { fontSize: contentSize, color: '000000' } },
        { text: `\nDecision Maker: ${fields.decision_maker || 'N/A'}`, options: { fontSize: contentSize, color: '000000' } },
        { text: `\nIntegration Event: ${fields.integration_event_id || 'N/A'}`, options: { fontSize: contentSize, color: '000000' } },
        { text: `\nSequence: ${fields.sequence || 'N/A'}`, options: { fontSize: contentSize, color: '000000' } }
      ], {
        x: margin + 0.1, 
        y: margin + 0.1, 
        w: leftColWidth - 0.2, 
        h: bannerHeight - 0.2,
        align: 'left',  // Horizontal alignment
        valign: 'top',   // Vertical alignment 
        // lineSpacing: 0.6  // This makes lines closer together (0.8 times normal spacing)
      });
      
      // Right banner
      slide.addShape('rect', {
        x: margin + leftColWidth + gapBetween, 
        y: margin, 
        w: rightColWidth, 
        h: bannerHeight,
        fill: { color: '#b3ff9f' },
        line: { color: '#999999', width: 0.5 }
      });
      
      slide.addText([
        { text: `Project Name: ${fields.project_name || 'Unnamed Project'}`, options: { bold: true, fontSize: titleSize, color: '000000' } },
        { text: `\nKey Decision #${fields.kd_number || 'N/A'}`, options: { fontSize: contentSize, color: '000000' } },
        { text: `\nStatus: ${fields.status || 'Draft'}`, options: { fontSize: contentSize, color: '000000' } }
      ], {
        x: margin + leftColWidth + gapBetween + 0.1, 
        y: margin + 0.1, 
        w: rightColWidth - 0.2, 
        h: bannerHeight - 0.2,
        align: 'left',  // Horizontal alignment
        valign: 'top'   // Vertical alignment 
      });
      
      // Key Decision section (left top)
      slide.addShape('rect', {
        x: margin, 
        y: margin + bannerHeight + 0.05, 
        w: leftColWidth, 
        h: contentHeight,
        fill: { color: '#ffffff' },
        line: { color: '#999999', width: 0.5 }
      });
      
      slide.addText([
        { text: 'The Key Decision', options: { bold: true, fontSize: titleSize, color: '000000' } },
        ...(fields.description ? [{ text: `\n${fields.description}`, options: { fontSize: contentSize, color: '000000' } }] : [])
      ], {
        x: margin + 0.1, 
        y: margin + bannerHeight + 0.15, 
        w: leftColWidth - 0.2, 
        h: contentHeight - 0.2,
        align: 'left',  // Horizontal alignment
        valign: 'top'   // Vertical alignment 
      });
      
      // What We Have Learned (right column)
      slide.addShape('rect', {
        x: margin + leftColWidth + gapBetween, 
        y: margin + bannerHeight + 0.05, 
        w: rightColWidth, 
        h: contentHeight * 2,
        fill: { color: '#ffffff' },
        line: { color: '#999999', width: 0.5 }
      });
      
      slide.addText([
        { text: 'What We Have Learned – summary of all Knowledge Gaps', options: { bold: true, fontSize: titleSize, color: '000000' } },
        ...(fields.what_we_have_learned ? [{ text: `\n${fields.what_we_have_learned}`, options: { fontSize: contentSize, color: '000000' } }] : [])
      ], {
        x: margin + leftColWidth + gapBetween + 0.1, 
        y: margin + bannerHeight + 0.15, 
        w: rightColWidth - 0.2, 
        h: contentHeight * 2 - 0.2,
        align: 'left',  // Horizontal alignment
        valign: 'top'   // Vertical alignment 
      });
      
      // Purpose section (left middle)
      slide.addShape('rect', {
        x: margin, 
        y: margin + bannerHeight + contentHeight + 0.1, 
        w: leftColWidth, 
        h: contentHeight,
        fill: { color: '#ffffff' },
        line: { color: '#999999', width: 0.5 }
      });
      
      slide.addText([
        { text: 'The Purpose', options: { bold: true, fontSize: titleSize, color: '000000' } },
        ...(fields.purpose ? [{ text: `\n${fields.purpose}`, options: { fontSize: contentSize, color: '000000' } }] : [])
      ], {
        x: margin + 0.1, 
        y: margin + bannerHeight + contentHeight + 0.2, 
        w: leftColWidth - 0.2, 
        h: contentHeight - 0.2,
        align: 'left',  // Horizontal alignment
        valign: 'top'   // Vertical alignment 
      });
      
      // What We Have Done (bottom left)
      slide.addShape('rect', {
        x: margin, 
        y: margin + bannerHeight + contentHeight * 2 + 0.15, 
        w: leftColWidth, 
        h: contentHeight,
        fill: { color: '#ffffff' },
        line: { color: '#999999', width: 0.5 }
      });
      
      slide.addText([
        { text: 'What We Have Done', options: { bold: true, fontSize: titleSize, color: '000000' } },
        ...(fields.what_we_have_done ? [{ text: `\n${fields.what_we_have_done}`, options: { fontSize: contentSize, color: '000000' } }] : [])
      ], {
        x: margin + 0.1, 
        y: margin + bannerHeight + contentHeight * 2 + 0.25, 
        w: leftColWidth - 0.2, 
        h: contentHeight - 0.2,
        align: 'left',  // Horizontal alignment
        valign: 'top'   // Vertical alignment 
      });
      
      // Recommendations section (bottom right)
      slide.addShape('rect', {
        x: margin + leftColWidth + gapBetween, 
        y: margin + bannerHeight + contentHeight * 2 + 0.15, 
        w: rightColWidth, 
        h: contentHeight,
        fill: { color: '#ffffff' },
        line: { color: '#999999', width: 0.5 }
      });
      
      slide.addText([
        { text: 'What We Recommend / What We Have Decided', options: { bold: true, fontSize: titleSize, color: '000000' } },
        ...(fields.recommendations ? [{ text: `\n${fields.recommendations}`, options: { fontSize: contentSize, color: '000000' } }] : [])
      ], {
        x: margin + leftColWidth + gapBetween + 0.1, 
        y: margin + bannerHeight + contentHeight * 2 + 0.25, 
        w: rightColWidth - 0.2, 
        h: contentHeight - 0.2,
        align: 'left',  // Horizontal alignment
        valign: 'top'   // Vertical alignment 
      });
    }
    
    // Generate a filename
    const reportType = selectedReport === 'knowledge_gap' ? 'KG' : 'KD';
    const reportNumber = selectedReport === 'knowledge_gap' ? (fields.kg_number || '') : (fields.kd_number || '');
    const filename = `${reportType}_${reportNumber}_${fields.title || 'Report'}.pptx`.replace(/\s+/g, '_');
    
    // Save the file
    pptx.writeFile({ fileName: filename })
      .then(() => {
        console.log(`PowerPoint exported successfully: ${filename}`);
      })
      .catch(err => {
        console.error('PowerPoint export error:', err);
        alert('Error exporting to PowerPoint. Please try again.');
      });
  };

  const exportPDF = async () => {
    if (!selectedReport) {
      alert('Please select a report type first.');
      return;
    }
    
    try {
      // Get field values for filename
      const fields = getReportFieldValues();
      
      // Generate a filename
      const reportType = selectedReport === 'knowledge_gap' ? 'KG' : 'KD';
      const reportNumber = selectedReport === 'knowledge_gap' ? (fields.kg_number || '') : (fields.kd_number || '');
      const filename = `${reportType}_${reportNumber}_${fields.title || 'Report'}.pdf`.replace(/\s+/g, '_');
      
      // Tell the user we're processing
      alert('Creating PDF, please wait...');
      
      // Create a new PDF document (landscape orientation)
      const pdf = new jsPDF('l', 'mm', 'a4');
      
      // Set up dimensions with 3mm margins
      const margin = 3; // Reduced to 5mm margins
      const width = 287; // A4 landscape width (297mm) minus margins
      const height = 200; // A4 landscape height (210mm) minus margins
      
      const leftColWidth = width * 0.49;
      const rightColWidth = width * 0.49;
      const gapBetween = width * 0.01;
      const bannerHeight = height * 0.15;
      const contentHeight = (height - bannerHeight) / 3.2;
      
      // Start the main content at the top of the page
      let y = margin;
      
      if (selectedReport === 'knowledge_gap') {
        // Left banner (yellow background)
        pdf.setFillColor(255, 250, 151); // #fffa97
        pdf.setDrawColor(153, 153, 153); // #999999
        pdf.rect(margin, y, leftColWidth, bannerHeight, 'FD'); // Fill and draw
        
        // Add text to left banner - using smaller font size
        pdf.setFontSize(9); // Header text slightly larger than body
        pdf.setTextColor(0, 0, 0);
        pdf.text(`Knowledge Gap: ${fields.title || 'Untitled'}`, margin + 5, y + 5);
        pdf.setFontSize(8); // Reduced text size
        pdf.text(`Owner: ${fields.owner || 'N/A'}`, margin + 5, y + 10);
        pdf.text(`Contributors: ${fields.contributors || 'N/A'}`, margin + 5, y + 14);
        pdf.text(`Learning Cycle: ${fields.learning_cycle || 'N/A'}`, margin + 5, y + 18);
        pdf.text(`Sequence: ${fields.sequence || 'N/A'}`, margin + 5, y + 22);
        
        // Right banner (yellow background)
        pdf.setFillColor(255, 250, 151); // #fffa97
        pdf.rect(margin + leftColWidth + gapBetween, y, rightColWidth, bannerHeight, 'FD');
        
        // Add text to right banner
        pdf.setFontSize(9);
        pdf.text(`Project Name: ${fields.project_name || 'Unnamed Project'}`, margin + leftColWidth + gapBetween + 5, y + 5);
        pdf.setFontSize(8);
        pdf.text(`Knowledge Gap #${fields.kg_number || 'N/A'}`, margin + leftColWidth + gapBetween + 5, y + 10);
        pdf.text(`Status: ${fields.status || 'In Progress'}`, margin + leftColWidth + gapBetween + 5, y + 14);
        
        // Move down past the banners
        y += bannerHeight + 3;
        
        // Question section (top left)
        pdf.setFillColor(255, 255, 255); // white
        pdf.rect(margin, y, leftColWidth, contentHeight, 'FD');
        pdf.setFontSize(9);
        pdf.setTextColor(0, 0, 0);
        pdf.text('The Question to Answer', margin + 5, y + 5);
        pdf.setFontSize(8);
        
        if (fields.description) {
          // For multiline text
          const splitDescription = pdf.splitTextToSize(fields.description, leftColWidth - 10);
          pdf.text(splitDescription, margin + 5, y + 10);
        }
        
        // What We Have Learned (right column)
        pdf.setFillColor(255, 255, 255); // white
        pdf.rect(margin + leftColWidth + gapBetween, y, rightColWidth, contentHeight * 2, 'FD');
        pdf.setFontSize(9);
        pdf.text('What We Have Learned', margin + leftColWidth + gapBetween + 5, y + 5);
        pdf.setFontSize(8);
        
        if (fields.what_we_have_learned) {
          const splitLearned = pdf.splitTextToSize(fields.what_we_have_learned, rightColWidth - 10);
          pdf.text(splitLearned, margin + leftColWidth + gapBetween + 5, y + 10);
        }
        
        // Purpose section (middle left)
        y += contentHeight + 3;
        pdf.setFillColor(255, 255, 255); // white
        pdf.rect(margin, y, leftColWidth, contentHeight, 'FD');
        pdf.setFontSize(9);
        pdf.text('The Purpose', margin + 5, y + 5);
        pdf.setFontSize(8);
        
        if (fields.purpose) {
          const splitPurpose = pdf.splitTextToSize(fields.purpose, leftColWidth - 10);
          pdf.text(splitPurpose, margin + 5, y + 10);
        }
        
        // What We Have Done (bottom left)
        y += contentHeight + 3;
        pdf.setFillColor(255, 255, 255); // white
        pdf.rect(margin, y, leftColWidth, contentHeight, 'FD');
        pdf.setFontSize(9);
        pdf.text('What We Have Done', margin + 5, y + 5);
        pdf.setFontSize(8);
        
        if (fields.what_we_have_done) {
          const splitDone = pdf.splitTextToSize(fields.what_we_have_done, leftColWidth - 10);
          pdf.text(splitDone, margin + 5, y + 10);
        }
        
        // Recommendations (bottom right)
        pdf.setFillColor(255, 255, 255); // white
        pdf.rect(margin + leftColWidth + gapBetween, y, rightColWidth, contentHeight, 'FD');
        pdf.setFontSize(9);
        pdf.text('Recommendations and Next Steps', margin + leftColWidth + gapBetween + 5, y + 5);
        pdf.setFontSize(8);
        
        if (fields.recommendations) {
          const splitRec = pdf.splitTextToSize(fields.recommendations, rightColWidth - 10);
          pdf.text(splitRec, margin + leftColWidth + gapBetween + 5, y + 10);
        }
        
      } else if (selectedReport === 'key_decision') {
        // Left banner (green background for KD)
        pdf.setFillColor(179, 255, 159); // #b3ff9f 
        pdf.setDrawColor(153, 153, 153); // #999999
        pdf.rect(margin, y, leftColWidth, bannerHeight, 'FD');
        
        // Add text to left banner
        pdf.setFontSize(9);
        pdf.setTextColor(0, 0, 0);
        pdf.text(`Key Decision: ${fields.title || 'Untitled'}`, margin + 5, y + 5);
        pdf.setFontSize(8);
        pdf.text(`Owner: ${fields.owner || 'N/A'}`, margin + 5, y + 10);
        pdf.text(`Decision Maker: ${fields.decision_maker || 'N/A'}`, margin + 5, y + 14);
        pdf.text(`Integration Event: ${fields.integration_event_id || 'N/A'}`, margin + 5, y + 18);
        pdf.text(`Sequence: ${fields.sequence || 'N/A'}`, margin + 5, y + 22);
        
        // Right banner (green background for KD)
        pdf.setFillColor(179, 255, 159); // #b3ff9f
        pdf.rect(margin + leftColWidth + gapBetween, y, rightColWidth, bannerHeight, 'FD');
        
        // Add text to right banner
        pdf.setFontSize(9);
        pdf.text(`Project Name: ${fields.project_name || 'Unnamed Project'}`, margin + leftColWidth + gapBetween + 5, y + 5);
        pdf.setFontSize(8);
        pdf.text(`Key Decision #${fields.kd_number || 'N/A'}`, margin + leftColWidth + gapBetween + 5, y + 10);
        pdf.text(`Status: ${fields.status || 'Draft'}`, margin + leftColWidth + gapBetween + 5, y + 14);
        
        // Move down past the banners
        y += bannerHeight + 3;
        
        // The Key Decision section (top left)
        pdf.setFillColor(255, 255, 255); // white
        pdf.rect(margin, y, leftColWidth, contentHeight, 'FD');
        pdf.setFontSize(9);
        pdf.setTextColor(0, 0, 0);
        pdf.text('The Key Decision', margin + 5, y + 5);
        pdf.setFontSize(8);
        
        if (fields.description) {
          const splitDescription = pdf.splitTextToSize(fields.description, leftColWidth - 10);
          pdf.text(splitDescription, margin + 5, y + 10);
        }
        
        // What We Have Learned (right column)
        pdf.setFillColor(255, 255, 255); // white
        pdf.rect(margin + leftColWidth + gapBetween, y, rightColWidth, contentHeight * 2, 'FD');
        pdf.setFontSize(9);
        pdf.text('What We Have Learned – summary of all Knowledge Gaps', margin + leftColWidth + gapBetween + 5, y + 5);
        pdf.setFontSize(8);
        
        if (fields.what_we_have_learned) {
          const splitLearned = pdf.splitTextToSize(fields.what_we_have_learned, rightColWidth - 10);
          pdf.text(splitLearned, margin + leftColWidth + gapBetween + 5, y + 10);
        }
        
        // Purpose section (middle left)
        y += contentHeight + 5;
        pdf.setFillColor(255, 255, 255); // white
        pdf.rect(margin, y, leftColWidth, contentHeight, 'FD');
        pdf.setFontSize(9);
        pdf.text('The Purpose', margin + 5, y + 5);
        pdf.setFontSize(8);
        
        if (fields.purpose) {
          const splitPurpose = pdf.splitTextToSize(fields.purpose, leftColWidth - 10);
          pdf.text(splitPurpose, margin + 5, y + 10);
        }
        
        // What We Have Done (bottom left)
        y += contentHeight + 5;
        pdf.setFillColor(255, 255, 255); // white
        pdf.rect(margin, y, leftColWidth, contentHeight, 'FD');
        pdf.setFontSize(9);
        pdf.text('What We Have Done', margin + 5, y + 5);
        pdf.setFontSize(8);
        
        if (fields.what_we_have_done) {
          const splitDone = pdf.splitTextToSize(fields.what_we_have_done, leftColWidth - 10);
          pdf.text(splitDone, margin + 5, y + 10);
        }
        
        // Recommendations (bottom right)
        pdf.setFillColor(255, 255, 255); // white
        pdf.rect(margin + leftColWidth + gapBetween, y, rightColWidth, contentHeight, 'FD');
        pdf.setFontSize(9);
        pdf.text('What We Recommend / What We Have Decided', margin + leftColWidth + gapBetween + 5, y + 5);
        pdf.setFontSize(8);
        
        if (fields.recommendations) {
          const splitRec = pdf.splitTextToSize(fields.recommendations, rightColWidth - 10);
          pdf.text(splitRec, margin + leftColWidth + gapBetween + 5, y + 10);
        }
      }
      
      // Save the PDF
      pdf.save(filename);
      
      console.log(`PDF exported successfully: ${filename}`);
      
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Error exporting to PDF: ' + err.message);
    }
  };


  const checkReportArchive = async () => {
    if (!selectedReport) {
      addChatMessage({
        role: 'ai',
        content: "Please select a report type first."
      });
      return;
    }
    
    // Add user message to chat
    addChatMessage({
      role: 'user',
      content: "Check Archive"
    });
    
    // Add a loading message
    addChatMessage({
      role: 'ai',
      content: "Searching archive for relevant documents...",
      isLoading: true
    });
    
    // Clear the sources list
    setSources([]);
    setAiLoading(true);
    
    try {
      // Get report context (all field values)
      const reportData = getReportFieldValues();
      
      // Determine the report type
      const reportType = selectedReport === 'knowledge_gap' ? 'kg' : 'kd';
      
      // Call the check archive service
      // REMOVED: selectedModel parameter
      const result = await reportAiService.checkArchive(reportData, reportType);
      
      // Remove the loading message and add the real response
      // We need to get current messages from context first
      const filteredMessages = chatMessages.filter(msg => !msg.isLoading);
      setChatMessages([
        ...filteredMessages,
        {
          role: 'ai',
          content: result.ai_response || "I couldn't find any relevant documents in our archive."
        }
      ]);
      
      // Update the sources state if we found any documents
      if (result.document_metadata && result.document_metadata.length > 0) {
        setSources(result.document_metadata);
      }
    } catch (err) {
      console.error('Error checking archive:', err);
      
      // Remove the loading message and add the error message
      const filteredMessages = chatMessages.filter(msg => !msg.isLoading);
      setChatMessages([
        ...filteredMessages,
        {
          role: 'ai',
          content: "Sorry, there was an error searching the archive. Please try again later."
        }
      ]);
    } finally {
      setAiLoading(false);
    }
  };
  

  const evaluateReport = async () => {
    if (!selectedReport) {
      addChatMessage({
        role: 'ai',
        content: "Please select a report to evaluate first."
      });
      return;
    }
    
    addChatMessage({
      role: 'user',
      content: "Evaluate this report."
    });
    
    setAiLoading(true);
    
    try {
      // Get all report field values
      const reportData = getReportFieldValues();
      
      // Add debugging logs
      console.log("Report data being sent to AI:", reportData);
      console.log("Form elements found:", document.querySelectorAll('#report-form-container input, #report-form-container textarea').length);
      
      let response;
      
      // Use the appropriate service based on report type
      // REMOVED: selectedModel parameter
      if (selectedReport === 'knowledge_gap') {
        response = await reportAiService.evaluateKGReport(reportData);
      } else if (selectedReport === 'key_decision') {
        response = await reportAiService.evaluateKDReport(reportData);
      }
      
      // Add AI response
      addChatMessage({
        role: 'ai',
        content: response.evaluation || response.error || "I couldn't evaluate the report."
      });
    } catch (err) {
      console.error('Error evaluating report:', err);
      addChatMessage({
        role: 'ai',
        content: err.message || "Sorry, there was an error evaluating your report. Please try again."
      });
    } finally {
      setAiLoading(false);
    }
  };


  const getReportFieldValues = () => {
    // No need to query the DOM anymore; simply return the formData from context
    return formData;
  };
  
  // Add this function to the ReportWriter component
  const extractDocumentIds = (aiResponse) => {
    if (!aiResponse) return [];
    
    const documents = [];
    // Look for document references in the AI response
    // Format: [Filename] (project_id: {project_id}, document_id: {document_id})
    const regex = /\[([^\]]+)\]\s*\(project_id:\s*([^,]+),\s*document_id:\s*([^)]+)\)/g;
    let match;
    
    while ((match = regex.exec(aiResponse)) !== null) {
      documents.push({
        filename: match[1],
        project_id: match[2].trim(),
        document_id: match[3].trim()
      });
    }
    
    return documents;
  };

  const handleOpenDocument = async (projectId, documentId, filename) => {
    try {
      // Get the auth token
      const user = JSON.parse(localStorage.getItem('user'));
      const token = user?.access_token;
      
      if (!token) {
        alert('Authentication token not found. Please log in again.');
        return;
      }
      
      // Get file extension
      const fileExtension = filename.split('.').pop().toLowerCase();
      
      if (fileExtension === 'pdf') {
        // PDFs can be viewed in the browser
        const response = await axios({
          url: `${API_URL}/archive/projects/${projectId}/documents/${documentId}/view`,
          method: 'GET',
          responseType: 'blob',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else if (['pptx', 'ppt', 'docx', 'doc'].includes(fileExtension)) {
        // For PowerPoint and Word files, show message and download
        // eslint-disable-next-line no-restricted-globals
        if (confirm(`Browser cannot display ${fileExtension.toUpperCase()} files directly. Do you want to download the file?`)) {
          const response = await axios({
            url: `${API_URL}/archive/projects/${projectId}/documents/${documentId}/view`,
            method: 'GET',
            responseType: 'blob',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          const blob = new Blob([response.data]);
          const url = window.URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', filename);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }
      } else {
        // For all other file types, just download
        const response = await axios({
          url: `${API_URL}/archive/projects/${projectId}/documents/${documentId}/view`,
          method: 'GET',
          responseType: 'blob',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const blob = new Blob([response.data]);
        const url = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error opening document:', err);
      alert('Failed to open file: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleNewReport = async () => {
    try {
      // First clear the local state using the context method
      clearReport();
      
      // Reset chat messages to just the welcome message
      setChatMessages([
        {
          role: 'ai',
          content: "Welcome to the RLC report writing assistant. I'm an AI designed to help you complete reports more quickly. I won't write anything for you, but I will help you quickly repackage your thoughts into well-structured reports. You have a few options to get started:\n\n1. You can fill in the report on screen.\n2. You can chat with me and give me instructions to fill it in.\n3. You can use the voice assistant and tell me everything you know about this report; then I will organize the information.\n\nAt the very end you can click \"Evaluate Report\" and I can help guide you on any missing information. You can also check your report against older reports from other projects by clicking \"Check Archive\"."
        },
        {
          role: 'ai',
          content: `I've started a new report. Please select a report type and begin filling in the details.`
        }
      ]);
      
      // Clear any search results
      setSources([]);
      
      // Reset selected report type
      setSelectedReport('');
      
      // Then clear the backend session if needed
      if (currentReport?.id) {
        await reportAiService.clearReportSession(currentReport.id, reportType, sessionId);
      }
      
      // Clear all form fields
      const formContainer = document.getElementById('report-form-container');
      if (formContainer) {
        const inputs = formContainer.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
          input.value = '';
        });
        
        // For selects, reset to first option
        const selects = formContainer.querySelectorAll('select');
        selects.forEach(select => {
          if (select.options.length > 0) {
            select.selectedIndex = 0;
          }
        });
      }
    } catch (error) {
      console.warn('Failed to clear report session:', error);
      // Don't block UI on backend errors
    }
  };

  // Modify the rendered chat messages to include feedback buttons
  return (
    <div className="report-writer-container">
      
      <div className="report-layout">
        <div className="report-chat">
          <h3>Chat Assistant</h3>
          <div className="chat-messages" id="report-chat-response">
            {chatMessages.map((msg, index) => (
              <div key={index} className={`chat-message ${msg.role}-message ${msg.isLoading ? 'loading' : ''}`}>
                <strong>{msg.role === 'ai' ? 'AI:' : 'You:'}</strong>{' '}
                {msg.isLoading ? (
                  <div className="loading-indicator">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </div>
                ) : (
                  // Add a wrapper div to hold both content and feedback buttons
                  <div className="message-wrapper">
                    <div className="message-content">
                      <MarkdownRenderer content={msg.content} />
                    </div>
                    
                    {/* Add feedback buttons only to AI messages */}
                    {msg.role === 'ai' && !msg.isLoading && (
                      <FeedbackButtons 
                        messageId={index}
                        onFeedbackSubmit={handleFeedbackSubmit}
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input-area">
            <textarea
              id="report-chat-input"
              value={chatInput}
              // onChange={(e) => setChatInput(e.target.value)}
              onChange={(e) => {
                const value = e.target.value;
                setChatInput(value);
                setIsTyping(value.trim().length > 0); // Set typing state based on input
              }}
              placeholder="Type a message..."
              disabled={isAiLoading} // Disable input while loading
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault(); // Prevent default to avoid newline
                  handleChatSubmit();
                }
              }}
            ></textarea>
            {isTyping ? (
              // Show send button when user is typing (no visible content)
              <button 
                className="voice-btn send-btn" 
                onClick={() => {
                  if (chatInput.trim()) {
                    handleChatSubmit();
                  }
                }}
                aria-label="Send message"
                disabled={isAiLoading || !chatInput.trim()}
              >
              </button>
            ) : (
              // Show microphone button when user is not typing
              <button 
                className="voice-btn" 
                onClick={startVoiceInput} 
                aria-label="Voice Input"
                disabled={isAiLoading}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path id="mic-top" d="M12 15C13.66 15 15 13.66 15 12V6C15 4.34 13.66 3 12 3C10.34 3 9 4.34 9 6V12C9 13.66 10.34 15 12 15Z" fill={isAiLoading ? "#cccccc" : "#8BB5E8"}/>
                  <path id="mic-bottom" d="M17 12C17 14.76 14.76 17 12 17C9.24 17 7 14.76 7 12H5C5 15.53 7.61 18.43 11 18.93V21H13V18.93C16.39 18.43 19 15.53 19 12H17Z" fill={isAiLoading ? "#cccccc" : "#8BB5E8"}/>
                </svg>
              </button>
            )}
            
          </div>
          <div className="chat-placeholder"></div>
          {/* Sources section */}
          {sources.length > 0 && (
            <div className="sources-section">
              <h4>Sources</h4>
              <ul className="sources-list">
                {sources.map((doc, index) => (
                  <li key={index} className="source-item">
                    <a 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        handleOpenDocument(doc.project_id, doc.document_id, doc.filename);
                      }}
                      className="source-link"
                    >
                      {doc.filename}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <div className="report-preview">
          <div className="report-preview-header">
            <h3>Report Preview</h3>
            <div className="report-select-container">
              <select 
                id="report-selection" 
                className="report-select"
                value={selectedReport}
                onChange={handleReportSelect}
              >
                <option value="">--Choose a Report--</option>
                <option value="knowledge_gap">Knowledge Gap</option>
                <option value="key_decision">Key Decision</option>
              </select>
            </div>
            <div className="actions-dropdown">
              <button className="actions-btn" onClick={() => setShowActionsMenu(!showActionsMenu)}>
                Actions
                <span className="dropdown-caret">▼</span>
              </button>
              {showActionsMenu && (
                <div className="actions-menu">
                  {/* Conditionally render Check Archive */}
                  {availableActions.checkArchive && (
                    <button onClick={() => {
                      checkReportArchive();
                      setShowActionsMenu(false);
                    }}>Check Archive</button>
                  )}
                  
                  {/* Always available actions */}
                  {availableActions.evaluateReport && (
                    <button onClick={() => {
                      evaluateReport();
                      setShowActionsMenu(false);
                    }}>Evaluate Report</button>
                  )}
                  
                  {availableActions.exportPowerPoint && (
                    <button onClick={() => {
                      exportPowerPoint();
                      setShowActionsMenu(false);
                    }}>Export as PPT</button>
                  )}
                  
                  {availableActions.exportPDF && (
                    <button onClick={() => {
                      exportPDF();
                      setShowActionsMenu(false);
                    }}>Export as PDF</button>
                  )}
                  
                  <div className="menu-divider"></div>
                  
                  {availableActions.clearSession && (
                    <button 
                      className="clear-session-btn" 
                      onClick={() => {
                        handleNewReport();
                        setShowActionsMenu(false);
                      }}
                    >
                      Clear Session
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* <div className="actions-dropdown">
              <button className="actions-btn" onClick={() => setShowActionsMenu(!showActionsMenu)}>
                Actions
                <span className="dropdown-caret">▼</span>
              </button>
              {showActionsMenu && (
                <div className="actions-menu">
                  <button onClick={() => {
                    checkReportArchive();
                    setShowActionsMenu(false);
                  }}>Check Archive</button>
                  <button onClick={() => {
                    evaluateReport();
                    setShowActionsMenu(false);
                  }}>Evaluate Report</button>
                  <button onClick={() => {
                    exportPowerPoint();
                    setShowActionsMenu(false);
                  }}>Export as PPT</button>
                  <button onClick={() => {
                    exportPDF();
                    setShowActionsMenu(false);
                  }}>Export as PDF</button>
                  <div className="menu-divider"></div>
                  <button 
                    className="clear-session-btn" 
                    onClick={() => {
                      handleNewReport();
                      setShowActionsMenu(false);
                    }}
                  >Clear & Start New Session</button>
                </div>
              )}
            </div> */}

          </div>
          <div id="report-form-container">
            {renderSelectedReport()}
          </div>
        </div>
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

export default ReportWriter;