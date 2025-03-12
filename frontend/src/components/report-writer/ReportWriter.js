// frontend/src/components/report-writer/ReportWriter.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import projectService from '../../services/projectService';
import keyDecisionService from '../../services/keyDecisionService';
import knowledgeGapService from '../../services/knowledgeGapService';
import './../../styles/report-writer.css';

const ReportWriter = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
  const [selectedReport, setSelectedReport] = useState('');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'ai',
      content: "Welcome to the RLC report writing assistant. I'm an AI designed to help you complete reports more quickly. I won't write anything for you, but I will help you quickly repackage your thoughts into well-structured reports. You have a few options to get started:\n\n1. You can fill in the report on screen.\n2. You can chat with me and give me instructions to fill it in.\n3. You can use the voice assistant and tell me everything you know about this report; then I will organize the information.\n\nAt the very end you can click \"Evaluate Report\" and I can help guide you on any missing information. You can also check your report against older reports from other projects by clicking \"Check Archive\"."
    }
  ]);
  
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
  
  const handleChatSubmit = () => {
    if (!chatInput.trim()) return;
    
    // Add user message to chat
    setChatMessages([
      ...chatMessages,
      { role: 'user', content: chatInput }
    ]);
    
    // Simulate AI response (in a real app, this would call your backend)
    setTimeout(() => {
      setChatMessages(prev => [
        ...prev,
        { 
          role: 'ai', 
          content: `I've noted your input about: "${chatInput}". What specific part of the report would you like me to help you with?` 
        }
      ]);
    }, 500);
    
    setChatInput('');
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
          <input type="text" defaultValue={kg.title} placeholder="KG Title..." style={{width:'80%'}}/><br/>
          Owner: <input type="text" defaultValue={kg.owner || ''} style={{width:'150px'}}/><br/>
          Contributors: <input type="text" defaultValue={Array.isArray(kg.contributors) ? kg.contributors.join(', ') : ''} style={{width:'200px'}}/><br/>
          Learning Cycle: <input type="text" defaultValue={kg.learning_cycle || ''} style={{width:'100px'}}/>
        </div>
        <div className="banner-right" style={{ gridArea: 'bannerRight' }}>
          <div style={{fontSize:'0.9em'}}>{project?.title || 'PROJECT NAME'}<br/>Knowledge Gap #{kd?.sequence || '??'}-{kg.sequence || '??'}</div>
          <div style={{marginTop:'5px'}}>{kg.status || 'In Progress'}</div>
        </div>
        <div className="template-box" style={{ gridArea: 'question' }}>
          <h4>The Question to Answer</h4>
          <textarea defaultValue={kg.description || ''}></textarea>
        </div>
        <div className="template-box template-large" style={{ gridArea: 'learned' }}>
          <h4>What We Have Learned</h4>
          <textarea defaultValue={kg.what_we_have_learned || kg.learned || ''} style={{height:'120px'}}></textarea>
        </div>
        <div className="template-box" style={{ gridArea: 'purpose' }}>
          <h4>The Purpose</h4>
          <p style={{fontSize:'0.9em'}}>(link back to the Knowledge Gap's Key Decision)</p>
          <textarea defaultValue={kg.purpose || ''}></textarea>
        </div>
        <div className="template-box template-large" style={{ gridArea: 'doneBox' }}>
          <h4>What We Have Done</h4>
          <p style={{fontSize:'0.9em'}}>summary of your plan to close the KG</p>
          <textarea defaultValue={kg.what_we_have_done || ''} style={{height:'120px'}}></textarea>
        </div>
        <div className="template-box template-large" style={{ gridArea: 'recBox' }}>
          <h4>Recommendations and Next Steps</h4>
          <textarea defaultValue={kg.recommendations || ''} style={{height:'80px'}}></textarea>
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
  
  // Functions for report actions
  const exportPowerPoint = () => alert('Export to PowerPoint feature would be implemented here');
  const exportPDF = () => alert('Export to PDF feature would be implemented here');
  const saveReportEdits = () => alert('Save edits feature would be implemented here');
  const lockAndComplete = () => alert('Lock and mark complete feature would be implemented here');
  const checkReportArchive = () => alert('Check archive feature would be implemented here');
  const evaluateReport = () => alert('Evaluate report feature would be implemented here');
  
  if (loading) {
    return <div className="loading">Loading report writer...</div>;
  }
  
  return (
    <div className="report-writer-container">
      <h2>Report Writer</h2>
      <p>Select a report to edit:</p>
      <select
        id="report-selection"
        value={selectedReport}
        onChange={handleReportSelect}
        className="report-select"
      >
        <option value="">--Choose a Report--</option>
        {reports.map(report => (
          <option key={report.id} value={report.id}>
            {report.title}
          </option>
        ))}
      </select>
      
      <div className="report-layout">
        <div className="report-chat">
          <h3>Chat Assistant</h3>
          <div className="chat-messages" id="report-chat-response">
            {chatMessages.map((msg, index) => (
              <div key={index} className={`chat-message ${msg.role}-message`}>
                <strong>{msg.role === 'ai' ? 'AI:' : 'You:'}</strong> {msg.content}
              </div>
            ))}
          </div>
          <div className="chat-input-area">
            <textarea
              id="report-chat-input"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
            ></textarea>
            <button onClick={handleChatSubmit}>Send</button>
            <button className="voice-btn" onClick={startVoiceInput} aria-label="Voice Input"></button>
          </div>
          <div className="chat-actions">
            <button onClick={checkReportArchive}>Check Archive</button>
            <button onClick={evaluateReport}>Evaluate Report</button>
          </div>
        </div>
        
        <div className="report-preview">
          <h3>Report Preview</h3>
          <div className="report-buttons">
            <button onClick={exportPowerPoint}>Export PPT</button>
            <button onClick={exportPDF}>Export PDF</button>
            <button onClick={saveReportEdits}>Save Edits</button>
            <button onClick={lockAndComplete}>Lock &amp; Mark Complete</button>
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