import React, { useState, useRef, useEffect } from 'react';
import './../../styles/report-writer.css';
import reportAiService from '../../services/reportAiService';
import pptxgen from 'pptxgenjs';
import jsPDF from 'jspdf';
import axios from 'axios';
// import archiveService from '../../services/archiveService';

const ReportWriter = () => {
  const [selectedReport, setSelectedReport] = useState('');
  // const [loading, setLoading] = useState(false);
  // const [error, setError] = useState(null);
  const [sources, setSources] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'ai',
      content: "Welcome to the RLC report writing assistant. I'm an AI designed to help you complete reports more quickly. I won't write anything for you, but I will help you quickly repackage your thoughts into well-structured reports. You have a few options to get started:\n\n1. You can fill in the report on screen.\n2. You can chat with me and give me instructions to fill it in.\n3. You can use the voice assistant and tell me everything you know about this report; then I will organize the information.\n\nAt the very end you can click \"Evaluate Report\" and I can help guide you on any missing information. You can also check your report against older reports from other projects by clicking \"Check Archive\"."
    }
  ]);

  // Auto-scroll to bottom of chat when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);
  
  // Handle report type selection
// Update the handleReportSelect function
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
  
  // Handle chat submission
  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return;
    
    // Add user message to chat
    const userMessage = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    
    // Clear input and show loading state
    setChatInput('');
    setIsAiLoading(true);
    
    try {
      // Get report context
      const reportContext = getReportFieldValues();
      
      let response;
      
      // Use the appropriate service based on report type
      if (selectedReport === 'knowledge_gap') {
        response = await reportAiService.processKGMessage(
          userMessage.content,
          null, // No report ID since we're not using the database
          reportContext
        );
      } else if (selectedReport === 'key_decision') {
        response = await reportAiService.processKDMessage(
          userMessage.content,
          null, // No report ID
          reportContext
        );
      } else {
        throw new Error("Please select a report type first.");
      }
      
      // Add AI response
      setChatMessages(prev => [...prev, {
        role: 'ai',
        content: response.answer || response.error || "Sorry, I couldn't process your request."
      }]);
    } catch (err) {
      console.error('Error from AI:', err);
      setChatMessages(prev => [...prev, {
        role: 'ai',
        content: err.message || "Sorry, there was an error processing your request. Please try again."
      }]);
    } finally {
      setIsAiLoading(false);
    }
  };
  
  // Voice input handler (placeholder)
  const startVoiceInput = () => {
    // This would implement speech recognition in a real app
    alert('Voice input feature would be implemented here');
  };
  
  // Render Key Decision report template
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
            // placeholder="Key Decision Title..." 
            style={{width:'80%', marginBottom: '5px'}}
          /><br/>
          Owner: <input 
            type="text" 
            className="field-kd-owner" 
            style={{width:'120px'}}
          /><br/>
          Decision Maker: <input 
            type="text" 
            className="field-kd-decision-maker" 
            style={{width:'120px'}}
          /><br/>
          Integration Event: <input 
            type="text" 
            className="field-kd-integration-event-id" 
            style={{width:'120px'}}
          /><br/>
          Sequence: <input 
            type="text"
            className="field-kd-sequence"
            style={{width:'60px'}}
            // placeholder="##"
          />
        </div>
        <div className="banner-right banner-right-kd" style={{ gridArea: 'bannerRight' }}>
          <strong>Project Name </strong><br/>
          <input 
            type="text" 
            className="field-kd-project-name" 
            style={{width:'90%', height:'3px'}}
            //placeholder="Project Name"
          /><br/>
          Key Decision: <input 
            type="text" 
            className="field-kd-number" 
            style={{width:'60px', height:'3px'}}
            // placeholder="##"
          /><br/>
          Status: 
          <select className="field-kd-status" style={{width: '100px', marginTop: '4px'}}>
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
            // placeholder="Describe the key decision to be made..."
          ></textarea>
        </div>
        <div className="template-box" style={{ gridArea: 'purpose' }}>
          <h4>The Purpose</h4>
          {/* <p style={{fontSize:'0.9em'}}>(link back to the project's Objectives)</p> */}
          <textarea 
            className="field-kd-purpose"
            // placeholder="Explain why this decision is important..."
          ></textarea>
        </div>
        <div className="template-box template-large" style={{ gridArea: 'learned' }}>
          <h4>What We Have Learned – summary of all Knowledge Gaps</h4>
          <textarea 
            className="field-kd-what-we-have-learned" 
            style={{height:'120px'}}
            // placeholder="Summarize what has been learned from knowledge gaps..."
          ></textarea>
        </div>
        <div className="template-box template-large" style={{ gridArea: 'doneBox' }}>
          <h4>What We Have Done</h4>
          {/* <p style={{fontSize:'0.9em'}}>summary of work to close knowledge gaps and build stakeholder alignment</p> */}
          <textarea 
            className="field-kd-what-we-have-done" 
            style={{height:'120px'}}
            // placeholder="Describe what has been done so far..."
          ></textarea>
        </div>
        <div className="template-box template-large" style={{ gridArea: 'recBox' }}>
          <h4>What We Recommend / What We Have Decided</h4>
          <textarea 
            className="field-kd-recommendations" 
            style={{height:'80px'}}
            // placeholder="Document the recommendation or decision..."
          ></textarea>
        </div>
      </div>
    );
  };
  
  // Render Knowledge Gap report template
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
            // placeholder="KG Title..." 
            style={{width:'80%'}}
          /><br/>
          Owner: <input 
            type="text" 
            className="field-owner"
            style={{width:'150px'}}
          /><br/>
          Contributors: <input 
            type="text" 
            className="field-contributors"
            style={{width:'200px'}}
            // placeholder="Comma separated names"
          /><br/>
          Learning Cycle: <input 
            type="text" 
            className="field-learning_cycle"
            style={{width:'100px'}}
          /><br/>
          Sequence: <input 
            type="text"
            className="field-sequence"
            style={{width:'60px'}}
            // placeholder="##"
          />
        </div>
        <div className="banner-right" style={{ gridArea: 'bannerRight' }}>
          <strong>Project Name: </strong><br/>
          <input 
            type="text" 
            className="field-project-name" 
            style={{width:'90%', height:'3px'}}
            // placeholder="Project Name"
          /><br/>
          Knowledge Gap <input 
            type="text" 
            className="field-kg-number" 
            style={{width:'60px', height:'3px'}}
            // placeholder="##"
          /><br/>
          Status: 
          <select className="field-status" style={{width: '100px', marginTop: '4px'}}>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="draft">Draft</option>
          </select>
        </div>
        <div className="template-box" style={{ gridArea: 'question' }}>
          <h4>The Question to Answer</h4>
          <textarea 
            className="field-description"
            style={{height:'80px'}}
            // placeholder="What question needs to be answered?"
          ></textarea>
        </div>
        <div className="template-box template-large" style={{ gridArea: 'learned' }}>
          <h4>What We Have Learned</h4>
          <textarea 
            className="field-what_we_have_learned"
            style={{height:'120px'}}
            // placeholder="Document what you have learned..."
          ></textarea>
        </div>
        <div className="template-box" style={{ gridArea: 'purpose' }}>
          <h4>The Purpose</h4>
          {/* <p style={{fontSize:'0.9em'}}>(link back to the Knowledge Gap's Key Decision)</p> */}
          <textarea 
            className="field-purpose"
            style={{height:'120px'}}
            // placeholder="Explain why this knowledge gap matters..."
          ></textarea>
        </div>
        <div className="template-box template-large" style={{ gridArea: 'doneBox' }}>
          <h4>What We Have Done</h4>
          <textarea 
            className="field-what_we_have_done"
            style={{height:'120px'}}
            // placeholder="Describe what has been done to address this knowledge gap..."
          ></textarea>
        </div>
        <div className="template-box template-large" style={{ gridArea: 'recBox' }}>
          <h4>Recommendations and Next Steps</h4>
          <textarea 
            className="field-recommendations"
            style={{height:'80px'}}
            // placeholder="Provide recommendations based on what was learned..."
          ></textarea>
        </div>
      </div>
    );
  };
  
  // Render the selected report template
  const renderSelectedReport = () => {
    if (!selectedReport) {
      return <p className="select-report-prompt">Please select a report from the dropdown above.</p>;
    }
    
    if (selectedReport === 'key_decision') {
      return renderKeyDecisionReport();
    } else if (selectedReport === 'knowledge_gap') {
      return renderKnowledgeGapReport();
    }
    
    return null;
  };
  
  // Helper function to format message text with basic markdown-like styling
  // const formatMessage = (text) => {
  //   if (!text) return '';
    
  //   // First, clean up any unexpected characters or encoding issues
  //   text = text.replace(/\$2/g, ''); // Remove any $2 placeholders
  //   text = text.replace(/\n\s*\n/g, '\n'); // Normalize multiple newlines
    
  //   // Replace headers
  //   text = text.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  //   text = text.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  //   text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  
  //   // Bold text
  //   text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  //   // Lists (handle both bullet and numbered)
  //   text = text.replace(/^([-•]\s+)(.+)$/gm, '<li>$2</li>');
  //   text = text.replace(/^(\d+\.\s+)(.+)$/gm, '<li>$2</li>');
    
  //   // Wrap consecutive list items
  //   text = text.replace(/(<li>.*<\/li>)+/g, '<ul>$&</ul>');
  
  //   // Additional cleanup
  //   text = text.replace(/\s+/g, ' ').trim();
  
  //   return text;
  // };
  // Update the formatMessage function
const formatMessage = (text) => {
  if (!text) return '';
  
  // Check if the text already contains HTML (like our buttons)
  if (text.includes('<button')) {
    // If it has HTML, we'll return it with minimal formatting
    // to avoid disrupting the button functionality
    return text;
  }
  
  // First, clean up any unexpected characters or encoding issues
  text = text.replace(/\$2/g, ''); // Remove any $2 placeholders
  text = text.replace(/\n\s*\n/g, '\n'); // Normalize multiple newlines
  
  // Replace headers
  text = text.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  text = text.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');

  // Bold text
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Lists (handle both bullet and numbered)
  text = text.replace(/^([-•]\s+)(.+)$/gm, '<li>$2</li>');
  text = text.replace(/^(\d+\.\s+)(.+)$/gm, '<li>$2</li>');
  
  // Wrap consecutive list items
  text = text.replace(/(<li>.*<\/li>)+/g, '<ul>$&</ul>');

  // Additional cleanup
  text = text.replace(/\s+/g, ' ').trim();

  return text;
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


  // const checkReportArchive = async () => {
  //   if (!selectedReport) {
  //     setChatMessages(prev => [...prev, {
  //       role: 'ai',
  //       content: "Please select a report type first."
  //     }]);
  //     return;
  //   }
    
  //   // Add user message to chat
  //   setChatMessages(prev => [...prev, {
  //     role: 'user',
  //     content: "Check Archive"
  //   }]);
    
  //   // Add a loading message
  //   setChatMessages(prev => [...prev, {
  //     role: 'ai',
  //     content: "Searching archive for relevant documents...",
  //     isLoading: true
  //   }]);
    
  //   setIsAiLoading(true);
    
  //   try {
  //     // Get report context (all field values)
  //     const reportData = getReportFieldValues();
      
  //     // Determine the report type
  //     const reportType = selectedReport === 'knowledge_gap' ? 'kg' : 'kd';
      
  //     // Call the check archive service
  //     const result = await reportAiService.checkArchive(reportData, reportType);
      
  //     // Remove the loading message and add the real response
  //     setChatMessages(prev => {
  //       const filteredMessages = prev.filter(msg => !msg.isLoading);
  //       return [
  //         ...filteredMessages,
  //         {
  //           role: 'ai',
  //           content: result.ai_response || "I've searched the archive but couldn't find relevant documents."
  //         }
  //       ];
  //     });
  //   } catch (err) {
  //     console.error('Error checking archive:', err);
      
  //     // Remove the loading message and add the error message
  //     setChatMessages(prev => {
  //       const filteredMessages = prev.filter(msg => !msg.isLoading);
  //       return [
  //         ...filteredMessages,
  //         {
  //           role: 'ai',
  //           content: "Sorry, there was an error searching the archive. Please try again later."
  //         }
  //       ];
  //     });
  //   } finally {
  //     setIsAiLoading(false);
  //   }
  // };
  const checkReportArchive = async () => {
    if (!selectedReport) {
      setChatMessages(prev => [...prev, {
        role: 'ai',
        content: "Please select a report type first."
      }]);
      return;
    }
    
    // Add user message to chat
    setChatMessages(prev => [...prev, {
      role: 'user',
      content: "Check Archive"
    }]);
    
    // Add a loading message
    setChatMessages(prev => [...prev, {
      role: 'ai',
      content: "Searching archive for relevant documents...",
      isLoading: true
    }]);
    
    // Clear the sources list
    setSources([]);
    
    setIsAiLoading(true);
    
    try {
      // Get report context (all field values)
      const reportData = getReportFieldValues();
      
      // Determine the report type
      const reportType = selectedReport === 'knowledge_gap' ? 'kg' : 'kd';
      
      // Call the check archive service
      const result = await reportAiService.checkArchive(reportData, reportType);
      
      // Remove the loading message and add the real response
      setChatMessages(prev => {
        const filteredMessages = prev.filter(msg => !msg.isLoading);
        return [
          ...filteredMessages,
          {
            role: 'ai',
            content: result.ai_response || "I couldn't find any relevant documents in our archive."
          }
        ];
      });
      
      // Update the sources state if we found any documents
      if (result.document_metadata && result.document_metadata.length > 0) {
        setSources(result.document_metadata);
      }
    } catch (err) {
      console.error('Error checking archive:', err);
      
      // Remove the loading message and add the error message
      setChatMessages(prev => {
        const filteredMessages = prev.filter(msg => !msg.isLoading);
        return [
          ...filteredMessages,
          {
            role: 'ai',
            content: "Sorry, there was an error searching the archive. Please try again later."
          }
        ];
      });
    } finally {
      setIsAiLoading(false);
    }
  };
  
  // Function to evaluate the report using AI
  const evaluateReport = async () => {
    if (!selectedReport) {
      setChatMessages(prev => [...prev, {
        role: 'ai',
        content: "Please select a report to evaluate first."
      }]);
      return;
    }
    
    setChatMessages(prev => [...prev, {
      role: 'user',
      content: "Evaluate this report."
    }]);
    
    setIsAiLoading(true);
    
    try {
      // Get all report field values
      const reportData = getReportFieldValues();
      
      // Add debugging logs
      console.log("Report data being sent to AI:", reportData);
      console.log("Form elements found:", document.querySelectorAll('#report-form-container input, #report-form-container textarea').length);
      
      let response;
      
      // Use the appropriate service based on report type
      if (selectedReport === 'knowledge_gap') {
        response = await reportAiService.evaluateKGReport(reportData);
      } else if (selectedReport === 'key_decision') {
        response = await reportAiService.evaluateKDReport(reportData);
      }
      
      // Add AI response
      setChatMessages(prev => [...prev, {
        role: 'ai',
        content: response.evaluation || response.error || "I couldn't evaluate the report."
      }]);
    } catch (err) {
      console.error('Error evaluating report:', err);
      setChatMessages(prev => [...prev, {
        role: 'ai',
        content: err.message || "Sorry, there was an error evaluating your report. Please try again."
      }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Get values from all form fields
  const getReportFieldValues = () => {
    const formContainer = document.getElementById('report-form-container');
    if (!formContainer) return {};
    
    const fields = {};
    
    // Helper function to get field value by class name
    const getFieldValue = (className) => {
      const element = formContainer.querySelector(`.${className}`);
      return element ? element.value : '';
    };
    
    if (selectedReport === 'knowledge_gap') {
      // For KG reports, collect all fields by their class names
      fields.title = getFieldValue('field-title');
      fields.owner = getFieldValue('field-owner');
      fields.contributors = getFieldValue('field-contributors');
      fields.learning_cycle = getFieldValue('field-learning_cycle');
      fields.sequence = getFieldValue('field-sequence');
      fields.status = getFieldValue('field-status');
      
      // Main content fields
      fields.description = getFieldValue('field-description');
      fields.purpose = getFieldValue('field-purpose');
      fields.what_we_have_learned = getFieldValue('field-what_we_have_learned');
      fields.what_we_have_done = getFieldValue('field-what_we_have_done');
      fields.recommendations = getFieldValue('field-recommendations');
      fields.project_name = getFieldValue('field-project-name');
      fields.kg_number = getFieldValue('field-kg-number');
      
    } else if (selectedReport === 'key_decision') {
      // For KD reports, use the specific class names
      fields.title = getFieldValue('field-kd-title');
      fields.owner = getFieldValue('field-kd-owner');
      fields.decision_maker = getFieldValue('field-kd-decision-maker');
      fields.integration_event_id = getFieldValue('field-kd-integration-event-id');
      fields.sequence = getFieldValue('field-kd-sequence');
      fields.status = getFieldValue('field-kd-status');
      
      // Main content fields
      fields.description = getFieldValue('field-kd-description');
      fields.purpose = getFieldValue('field-kd-purpose');
      fields.what_we_have_learned = getFieldValue('field-kd-what-we-have-learned');
      fields.what_we_have_done = getFieldValue('field-kd-what-we-have-done');
      fields.recommendations = getFieldValue('field-kd-recommendations');
      fields.project_name = getFieldValue('field-kd-project-name');
      fields.kd_number = getFieldValue('field-kd-number');
    }
    
    console.log("Collected fields for evaluation:", fields);
    return fields;
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

  // Add this function to the ReportWriter component
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
          url: `http://localhost:8000/archive/projects/${projectId}/documents/${documentId}/view`,
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
            url: `http://localhost:8000/archive/projects/${projectId}/documents/${documentId}/view`,
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
          url: `http://localhost:8000/archive/projects/${projectId}/documents/${documentId}/view`,
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


  // Main component render
  return (
    <div className="report-writer-container">
      <div className="report-select-container">
        <h2>Report Writer</h2>
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
                  <div 
                    className="message-content"
                    dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                  />
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input-area">
            <textarea
              id="report-chat-input"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              disabled={isAiLoading} // Disable input while loading
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault(); // Prevent default to avoid newline
                  handleChatSubmit();
                }
              }}
            ></textarea>
            <button 
              className="voice-btn" 
              onClick={startVoiceInput} 
              aria-label="Voice Input"
              disabled={isAiLoading} // Disable voice input while loading
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 15C13.66 15 15 13.66 15 12V6C15 4.34 13.66 3 12 3C10.34 3 9 4.34 9 6V12C9 13.66 10.34 15 12 15Z" fill={isAiLoading ? "#cccccc" : "#8BB5E8"}/>
                <path d="M17 12C17 14.76 14.76 17 12 17C9.24 17 7 14.76 7 12H5C5 15.53 7.61 18.43 11 18.93V21H13V18.93C16.39 18.43 19 15.53 19 12H17Z" fill={isAiLoading ? "#cccccc" : "#8BB5E8"}/>
              </svg>
            </button>
          </div>
          <div className="chat-actions">
            <button 
              className="action-btn archive-btn" 
              onClick={checkReportArchive}
              disabled={isAiLoading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 8V21H3V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 4H21V8H3V4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="btn-text">Check Archive</span>
            </button>
            <button 
              className="action-btn evaluate-btn" 
              onClick={evaluateReport}
              disabled={isAiLoading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="btn-text">Evaluate Report</span>
            </button>
          </div>

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
            <div className="report-buttons">
              <button onClick={exportPowerPoint}>Export PPT</button>
              <button onClick={exportPDF}>Export PDF</button>
            </div>
          </div>
          <div id="report-form-container">
            {renderSelectedReport()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportWriter;