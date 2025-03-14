import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import projectService from '../../services/projectService';
import keyDecisionService from '../../services/keyDecisionService';
import knowledgeGapService from '../../services/knowledgeGapService';
import './../../styles/report-writer.css';
import kgReportAiService from '../../services/kgReportAiService';

const ReportWriter = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
  const [selectedReport, setSelectedReport] = useState('');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'ai',
      content: "Welcome to the RLC report writing assistant. I'm an AI designed to help you complete reports more quickly. I won't write anything for you, but I will help you quickly repackage your thoughts into well-structured reports. You have a few options to get started:\n\n1. You can fill in the report on screen.\n2. You can chat with me and give me instructions to fill it in.\n3. You can use the voice assistant and tell me everything you know about this report; then I will organize the information.\n\nAt the very end you can click \"Evaluate Report\" and I can help guide you on any missing information. You can also check your report against older reports from other projects by clicking \"Check Archive\"."
    }
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch project details
        const projectData = await projectService.getProjectById(projectId);
        setProject(projectData);
        
        // Fetch key decisions for this project to build report options
        const keyDecisions = await keyDecisionService.getProjectKeyDecisions(projectId);
        
        // For each key decision, also fetch its knowledge gaps
        const reportsData = [];
        for (const kd of keyDecisions) {
          reportsData.push({
            id: kd.id,
            type: 'kd',
            title: `KD ${kd.sequence || '??'} - ${kd.title}`,
            data: kd
          });
          
          // Get knowledge gaps for this key decision
          const kgs = await knowledgeGapService.getProjectKnowledgeGaps(projectId, kd.id);
          
          for (const kg of kgs) {
            reportsData.push({
              id: kg.id,
              type: 'kg',
              title: `KG ${kd.sequence || '??'}-${kg.sequence || '??'} - ${kg.title}`,
              data: kg,
              keyDecision: kd
            });
          }
        }
        
        setReports(reportsData);
        setLoading(false);
      } catch (err) {
        console.error("Error loading report data:", err);
        setError("Failed to load project data. Please try again.");
        setLoading(false);
      }
    };
    
    fetchData();
  }, [projectId]);
  
  const handleReportSelect = (e) => {
    setSelectedReport(e.target.value);
  };
  
  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return;
    
    // Add user message to chat
    const userMessage = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    
    // Clear input and show loading state
    setChatInput('');
    setIsAiLoading(true);
    
    try {
      // Get the current report
      const currentReport = reports.find(r => r.id === selectedReport);
      
      if (!currentReport) {
        throw new Error("Please select a report first.");
      }
      
      // Get report context
      const reportContext = getReportFieldValues();
      
      let response;
      
      // Use the appropriate service based on report type
      if (currentReport.type === 'kg') {
        response = await kgReportAiService.processMessage(
          userMessage.content,
          currentReport.id,
          reportContext
        );
      } else if (currentReport.type === 'kd') {
        // Future implementation for KD reports
        throw new Error("KD report AI assistance not yet implemented.");
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
  
  const startVoiceInput = () => {
    // This would implement speech recognition in a real app
    alert('Voice input feature would be implemented here');
  };
  
  const renderKeyDecisionReport = (kd) => {
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
          <strong>Key Decision (title can have keywords):</strong><br/>
          Owner: <input type="text" defaultValue={kd.owner || ''} style={{width:'120px'}}/><br/>
          Decision Maker: <input type="text" defaultValue={kd.decision_maker || ''} style={{width:'120px'}}/><br/>
          Integration Event: <input type="text" style={{width:'120px'}}/>
        </div>
        <div className="banner-right banner-right-kd" style={{ gridArea: 'bannerRight' }}>
          <div style={{fontSize:'0.9em'}}>{project?.title || 'PROJECT NAME'}<br/>Key Decision #{kd.sequence || '??'}</div>
        </div>
        <div className="template-box" style={{ gridArea: 'kdBox' }}>
          <h4>The Key Decision</h4>
          <textarea defaultValue={kd.description || ''}></textarea>
        </div>
        <div className="template-box" style={{ gridArea: 'purpose' }}>
          <h4>The Purpose</h4>
          <p style={{fontSize:'0.9em'}}>(link back to the project's Objectives)</p>
          <textarea defaultValue={kd.purpose || ''}></textarea>
        </div>
        <div className="template-box template-large" style={{ gridArea: 'learned' }}>
          <h4>What We Have Learned – summary of all Knowledge Gaps</h4>
          <textarea defaultValue={kd.what_we_have_learned || ''} style={{height:'120px'}}></textarea>
        </div>
        <div className="template-box template-large" style={{ gridArea: 'doneBox' }}>
          <h4>What We Have Done</h4>
          <p style={{fontSize:'0.9em'}}>summary of work to close knowledge gaps and build stakeholder alignment</p>
          <textarea defaultValue={kd.what_we_have_done || ''} style={{height:'120px'}}></textarea>
        </div>
        <div className="template-box template-large" style={{ gridArea: 'recBox' }}>
          <h4>What We Recommend / What We Have Decided</h4>
          <textarea defaultValue={kd.recommendations || ''} style={{height:'80px'}}></textarea>
        </div>
      </div>
    );
  };
  
  // const renderKnowledgeGapReport = (kg, kd) => {
  //   return (
  //     <div className="template-grid" style={{
  //       gridTemplateAreas: `
  //         'bannerLeft bannerRight'
  //         'question   learned'
  //         'purpose    learned'
  //         'doneBox    recBox'
  //       `
  //     }}>
  //       <div className="banner-left" style={{ gridArea: 'bannerLeft' }}>
  //         <strong>Knowledge Gap: </strong>
  //         <input type="text" defaultValue={kg.title} placeholder="KG Title..." style={{width:'80%'}}/><br/>
  //         Owner: <input type="text" defaultValue={kg.owner || ''} style={{width:'150px'}}/><br/>
  //         Contributors: <input type="text" defaultValue={Array.isArray(kg.contributors) ? kg.contributors.join(', ') : ''} style={{width:'200px'}}/><br/>
  //         Learning Cycle: <input type="text" defaultValue={kg.learning_cycle || ''} style={{width:'100px'}}/>
  //       </div>
  //       <div className="banner-right" style={{ gridArea: 'bannerRight' }}>
  //         <div style={{fontSize:'0.9em'}}>{project?.title || 'PROJECT NAME'}<br/>Knowledge Gap #{kd?.sequence || '??'}-{kg.sequence || '??'}</div>
  //         <div style={{marginTop:'5px'}}>{kg.status || 'In Progress'}</div>
  //       </div>
  //       <div className="template-box" style={{ gridArea: 'question' }}>
  //         <h4>The Question to Answer</h4>
  //         <textarea defaultValue={kg.description || ''}></textarea>
  //       </div>
  //       <div className="template-box template-large" style={{ gridArea: 'learned' }}>
  //         <h4>What We Have Learned</h4>
  //         <textarea defaultValue={kg.what_we_have_learned || kg.learned || ''} style={{height:'120px'}}></textarea>
  //       </div>
  //       <div className="template-box" style={{ gridArea: 'purpose' }}>
  //         <h4>The Purpose</h4>
  //         <p style={{fontSize:'0.9em'}}>(link back to the Knowledge Gap's Key Decision)</p>
  //         <textarea defaultValue={kg.purpose || ''}></textarea>
  //       </div>
  //       <div className="template-box template-large" style={{ gridArea: 'doneBox' }}>
  //         <h4>What We Have Done</h4>
  //         <p style={{fontSize:'0.9em'}}>summary of your plan to close the KG</p>
  //         <textarea defaultValue={kg.what_we_have_done || ''} style={{height:'120px'}}></textarea>
  //       </div>
  //       <div className="template-box template-large" style={{ gridArea: 'recBox' }}>
  //         <h4>Recommendations and Next Steps</h4>
  //         <textarea defaultValue={kg.recommendations || ''} style={{height:'80px'}}></textarea>
  //       </div>
  //       <div className="template-box purpose" style={{ gridArea: 'purpose' }}>
  //         <h4>
  //           The Purpose 
  //           <span className="subtitle">(link back to the Knowledge Gap's Key Decision)</span>
  //         </h4>
  //         <textarea defaultValue={kg.purpose || ''}></textarea>
  //       </div>
        
  //       <div className="template-box template-large learned" style={{ gridArea: 'learned' }}>
  //         <h4>What We Have Learned</h4>
  //         <textarea 
  //           defaultValue={kg.what_we_have_learned || kg.learned || ''} 
  //           style={{height:'100%'}}
  //         ></textarea>
  //       </div>
        
  //       <div className="template-box template-large done-box" style={{ gridArea: 'doneBox' }}>
  //         <h4>
  //           What We Have Done 
  //           <span className="subtitle">summary of your plan to close the KG</span>
  //         </h4>
  //         <textarea 
  //           defaultValue={kg.what_we_have_done || ''} 
  //           style={{height:'100%'}}
  //         ></textarea>
  //       </div>
        
  //       <div className="template-box template-large recommendations" style={{ gridArea: 'recBox' }}>
  //         <h4>Recommendations and Next Steps</h4>
  //         <textarea 
  //           defaultValue={kg.recommendations || ''} 
  //           style={{height:'100%'}}
  //         ></textarea>
  //       </div>
  //     </div>
  //   );
  // };
  // const renderKnowledgeGapReport = (kg, kd) => {
  //   return (
  //     <div className="template-grid" style={{
  //       gridTemplateAreas: `
  //         'bannerLeft bannerRight'
  //         'question   learned'
  //         'purpose    learned'
  //         'doneBox    recBox'
  //       `
  //     }}>
  //       <div className="banner-left" style={{ gridArea: 'bannerLeft' }}>
  //         <strong>Knowledge Gap: </strong>
  //         <input type="text" defaultValue={kg.title} placeholder="KG Title..." style={{width:'80%'}}/><br/>
  //         Owner: <input type="text" defaultValue={kg.owner || ''} style={{width:'150px'}}/><br/>
  //         Contributors: <input type="text" defaultValue={Array.isArray(kg.contributors) ? kg.contributors.join(', ') : ''} style={{width:'200px'}}/><br/>
  //         Learning Cycle: <input type="text" defaultValue={kg.learning_cycle || ''} style={{width:'100px'}}/>
  //       </div>
  //       <div className="banner-right" style={{ gridArea: 'bannerRight' }}>
  //         <div style={{fontSize:'0.9em'}}>{project?.title || 'PROJECT NAME'}<br/>Knowledge Gap #{kd?.sequence || '??'}-{kg.sequence || '??'}</div>
  //         <div style={{marginTop:'5px'}}>{kg.status || 'In Progress'}</div>
  //       </div>
  //       <div className="template-box" style={{ gridArea: 'question' }}>
  //         <h4>The Question to Answer</h4>
  //         <textarea defaultValue={kg.description || ''}></textarea>
  //       </div>
  //       <div className="template-box template-large" style={{ gridArea: 'learned' }}>
  //         <h4>What We Have Learned</h4>
  //         <textarea defaultValue={kg.what_we_have_learned || kg.learned || ''} style={{height:'120px'}}></textarea>
  //       </div>
  //       <div className="template-box" style={{ gridArea: 'purpose' }}>
  //         <h4>The Purpose</h4>
  //         <p style={{fontSize:'0.9em'}}>(link back to the Knowledge Gap's Key Decision)</p>
  //         <textarea defaultValue={kg.purpose || ''}></textarea>
  //       </div>
  //       <div className="template-box template-large" style={{ gridArea: 'doneBox' }}>
  //         <h4>What We Have Done</h4>
  //         <p style={{fontSize:'0.9em'}}>summary of your plan to close the KG</p>
  //         <textarea defaultValue={kg.what_we_have_done || ''} style={{height:'120px'}}></textarea>
  //       </div>
  //       <div className="template-box template-large" style={{ gridArea: 'recBox' }}>
  //         <h4>Recommendations and Next Steps</h4>
  //         <textarea defaultValue={kg.recommendations || ''} style={{height:'80px'}}></textarea>
  //       </div>
  //       <div className="template-box purpose" style={{ gridArea: 'purpose' }}>
  //         <h4>
  //           The Purpose 
  //           <span className="subtitle">(link back to the Knowledge Gap's Key Decision)</span>
  //         </h4>
  //         <textarea defaultValue={kg.purpose || ''}></textarea>
  //       </div>
  //       <div className="template-box template-large learned" style={{ gridArea: 'learned' }}>
  //         <h4>What We Have Learned</h4>
  //         <textarea 
  //           defaultValue={kg.what_we_have_learned || kg.learned || ''} 
  //           style={{height:'100%'}}
  //         ></textarea>
  //       </div>
  //       <div className="template-box template-large done-box" style={{ gridArea: 'doneBox' }}>
  //         <h4>
  //           What We Have Done 
  //           <span className="subtitle">summary of your plan to close the KG</span>
  //         </h4>
  //         <textarea 
  //           defaultValue={kg.what_we_have_done || ''} 
  //           style={{height:'100%'}}
  //         ></textarea>
  //       </div>
  //       <div className="template-box template-large recommendations" style={{ gridArea: 'recBox' }}>
  //         <h4>Recommendations and Next Steps</h4>
  //         <textarea 
  //           defaultValue={kg.recommendations || ''} 
  //           style={{height:'100%'}}
  //         ></textarea>
  //       </div>
  //     </div>
  //   );
  // };

  const renderKnowledgeGapReport = (kg, kd) => {
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
            defaultValue={kg.title} 
            placeholder="KG Title..." 
            style={{width:'80%'}}
          /><br/>
          Owner: <input 
            type="text" 
            className="field-owner"
            defaultValue={kg.owner || ''} 
            style={{width:'150px'}}
          /><br/>
          Contributors: <input 
            type="text" 
            className="field-contributors"
            defaultValue={Array.isArray(kg.contributors) ? kg.contributors.join(', ') : ''} 
            style={{width:'200px'}}
          /><br/>
          Learning Cycle: <input 
            type="text" 
            className="field-learning_cycle"
            defaultValue={kg.learning_cycle || ''} 
            style={{width:'100px'}}
          />
        </div>
        <div className="banner-right" style={{ gridArea: 'bannerRight' }}>
          <div style={{fontSize:'0.9em'}}>{project?.title || 'PROJECT NAME'}<br/>Knowledge Gap #{kd?.sequence || '??'}-{kg.sequence || '??'}</div>
          <div style={{marginTop:'5px'}}>{kg.status || 'In Progress'}</div>
        </div>
        <div className="template-box" style={{ gridArea: 'question' }}>
          <h4>The Question to Answer</h4>
          <textarea 
            className="field-description"
            defaultValue={kg.description || ''}
            style={{height:'80px'}}
          ></textarea>
        </div>
        <div className="template-box template-large" style={{ gridArea: 'learned' }}>
          <h4>What We Have Learned</h4>
          <textarea 
            className="field-what_we_have_learned"
            defaultValue={kg.what_we_have_learned || kg.learned || ''} 
            style={{height:'120px'}}
          ></textarea>
        </div>
        <div className="template-box" style={{ gridArea: 'purpose' }}>
          <h4>The Purpose</h4>
          {/* <p style={{fontSize:'0.9em'}}>(link back to the Knowledge Gap's Key Decision)</p> */}
          <textarea 
            className="field-purpose"
            defaultValue={kg.purpose || ''}
            style={{height:'120px'}}
          ></textarea>
        </div>
        <div className="template-box template-large" style={{ gridArea: 'doneBox' }}>
          <h4>What We Have Done</h4>
          {/* <p style={{fontSize:'0.9em'}}>summary of your plan to close the KG</p> */}
          <textarea 
            className="field-what_we_have_done"
            defaultValue={kg.what_we_have_done || ''} 
            style={{height:'120px'}}
          ></textarea>
        </div>
        <div className="template-box template-large" style={{ gridArea: 'recBox' }}>
          <h4>Recommendations and Next Steps</h4>
          <textarea 
            className="field-recommendations"
            defaultValue={kg.recommendations || ''} 
            style={{height:'80px'}}
          ></textarea>
        </div>
      </div>
    );
  };
  
  const renderSelectedReport = () => {
    if (!selectedReport) {
      return <p className="select-report-prompt">Please select a report from the dropdown above.</p>;
    }
    
    const report = reports.find(r => r.id === selectedReport);
    if (!report) return null;
    
    if (report.type === 'kd') {
      return renderKeyDecisionReport(report.data);
    } else if (report.type === 'kg') {
      return renderKnowledgeGapReport(report.data, report.keyDecision);
    }
    
    return null;
  };
  
  // Helper function to format message text with basic markdown-like styling
  const formatMessage = (text) => {
    if (!text) return '';
    
    console.log('Original message:', JSON.stringify(text));
  
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
  
    console.log('Formatted message:', JSON.stringify(text));
  
    return text;
  };

  // Functions for report actions
  const exportPowerPoint = () => alert('Export to PowerPoint feature would be implemented here');
  const exportPDF = () => alert('Export to PDF feature would be implemented here');
  const saveReportEdits = () => alert('Save edits feature would be implemented here');
  const lockAndComplete = () => alert('Lock and mark complete feature would be implemented here');
  const checkReportArchive = () => alert('Check archive feature would be implemented here');
  
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
      // Get the current report
      const currentReport = reports.find(r => r.id === selectedReport);
      
      // Get all report field values
      const reportData = getReportFieldValues();
      
      // Add debugging logs
      console.log("Report data being sent to AI:", reportData);
      console.log("Form elements found:", document.querySelectorAll('#report-form-container input, #report-form-container textarea').length);
      
      let response;
      
      // Use the appropriate service based on report type
      if (currentReport.type === 'kg') {
        response = await kgReportAiService.evaluateReport(reportData);
      } else if (currentReport.type === 'kd') {
        // Future implementation for KD reports
        throw new Error("KD report evaluation not yet implemented.");
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
  
  if (loading) {
    return <div className="loading">Loading report writer...</div>;
  }

  // const getReportFieldValues = () => {
  //   const formContainer = document.getElementById('report-form-container');
  //   if (!formContainer) return {};
    
  //   const fields = {};
  //   const inputs = formContainer.querySelectorAll('input, textarea');
    
  //   // Current report type
  //   const currentReport = reports.find(r => r.id === selectedReport);
    
  //   if (currentReport && currentReport.type === 'kg') {
  //     // For Knowledge Gap reports, map inputs to their logical field names
  //     // We're using the same order as they appear in the form
  //     // but mapping them to semantic field names
      
  //     // Map each input/textarea to the appropriate field based on position
  //     // This assumes the elements are always in the same order
  //     const fieldMap = [
  //       'title',          // Input 0 - Title
  //       'owner',          // Input 1 - Owner
  //       'contributors',   // Input 2 - Contributors
  //       'learning_cycle', // Input 3 - Learning Cycle
  //       'description',    // Textarea 0 - Question to Answer
  //       'what_we_have_learned', // Textarea 1 - What We Have Learned
  //       'purpose',        // Textarea 2 - Purpose
  //       'what_we_have_done',    // Textarea 3 - What We Have Done
  //       'recommendations' // Textarea 4 - Recommendations
  //     ];
      
  //     // Create the field mapping
  //     inputs.forEach((input, index) => {
  //       if (index < fieldMap.length) {
  //         fields[fieldMap[index]] = input.value || '';
  //       } else {
  //         fields[`field_${index}`] = input.value || '';
  //       }
  //     });
  //   } 
  //   else if (currentReport && currentReport.type === 'kd') {
  //     // Similar mapping for KD reports would go here when implemented
  //   }
    
  //   console.log("Collected fields for evaluation:", fields);
  //   return fields;
  // };

  const getReportFieldValues = () => {
    const formContainer = document.getElementById('report-form-container');
    if (!formContainer) return {};
    
    const fields = {};
    
    // Get all the fields by their class names
    const getFieldValue = (className) => {
      const element = formContainer.querySelector(`.${className}`);
      return element ? element.value : '';
    };
    
    // Current report type
    const currentReport = reports.find(r => r.id === selectedReport);
    const reportType = currentReport?.type || '';
    
    if (reportType === 'kg') {
      // For KG reports, collect all fields by their class names
      fields.title = getFieldValue('field-title');
      fields.owner = getFieldValue('field-owner');
      fields.contributors = getFieldValue('field-contributors');
      fields.learning_cycle = getFieldValue('field-learning_cycle');
      fields.description = getFieldValue('field-description');
      fields.purpose = getFieldValue('field-purpose');
      fields.what_we_have_learned = getFieldValue('field-what_we_have_learned');
      fields.what_we_have_done = getFieldValue('field-what_we_have_done');
      fields.recommendations = getFieldValue('field-recommendations');
    } else if (reportType === 'kd') {
      // Similar mapping for KD reports would go here
      // We'll implement this later when KD reports are supported
    }
    
    console.log("Collected fields for evaluation:", fields);
    return fields;
  };
  
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
          {reports.map(report => (
            <option key={report.id} value={report.id}>
              {report.title}
            </option>
          ))}
        </select>
    </div>
      
      <div className="report-layout">
        <div className="report-chat">
          <h3>Chat Assistant</h3>
          <div className="chat-messages" id="report-chat-response">
            {chatMessages.map((msg, index) => (
              <div key={index} className={`chat-message ${msg.role}-message`}>
                <strong>{msg.role === 'ai' ? 'AI:' : 'You:'}</strong>{' '}
                <div 
                  className="message-content"
                  dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                />
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
            ></textarea>
            <div className="chat-input-buttons">
              <button className="send-btn" onClick={handleChatSubmit}></button>
              <button className="voice-btn" onClick={startVoiceInput} aria-label="Voice Input"></button>
            </div>
          </div>
          <div className="chat-actions">
            <button onClick={checkReportArchive}>Check Archive</button>
            <button onClick={evaluateReport}>Evaluate Report</button>
          </div>
        </div>
        
        <div className="report-preview">
          <div className="report-preview-header">
            <h3>Report Preview</h3>
            <div className="report-buttons">
              <button onClick={exportPowerPoint}>Export PPT</button>
              <button onClick={exportPDF}>Export PDF</button>
              <button onClick={saveReportEdits}>Save Edits</button>
              <button onClick={lockAndComplete}>Lock &amp; Mark Complete</button>
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