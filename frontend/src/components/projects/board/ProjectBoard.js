import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import Column from './Column';
import Card from './Card';
import KeyDecisionModal from '../../modals/KeyDecisionModal';
import projectService from '../../../services/projectService';
import keyDecisionService from '../../../services/keyDecisionService';
import knowledgeGapService from '../../../services/knowledgeGapService';
import integrationEventService from '../../../services/integrationEventService';

const ProjectBoard = () => {
  const [project, setProject] = useState(null);
  const [events, setEvents] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [knowledgeGaps, setKnowledgeGaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isKDModalOpen, setIsKDModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [activeDecision, setActiveDecision] = useState(null);
  
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Configure DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch project details
        const projectData = await projectService.getProjectById(id);
        setProject(projectData);
        
        // Fetch integration events
        const eventsData = await integrationEventService.getProjectEvents(id);
        setEvents(eventsData);
        
        // Fetch all key decisions for this project
        const decisionsData = await keyDecisionService.getProjectKeyDecisions(id);
        setDecisions(decisionsData);
        
        // Fetch all knowledge gaps for this project
        const kgData = await knowledgeGapService.getProjectKnowledgeGaps(id);
        setKnowledgeGaps(kgData);
        
        setLoading(false);
      } catch (err) {
        console.error("Error loading board data:", err);
        setError("Failed to load project data. Please try again.");
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);

  // Get knowledge gaps for a specific decision
  const getKnowledgeGapsForDecision = (decisionId) => {
    return knowledgeGaps.filter(kg => kg.key_decision_id === decisionId);
  };

  // Enhance decisions with their knowledge gaps
  const enhanceDecisionsWithKGs = (decisions) => {
    return decisions.map(decision => {
      const decisionKGs = getKnowledgeGapsForDecision(decision.id);
      return {
        ...decision,
        knowledgeGapDetails: decisionKGs
      };
    });
  };

  const handleDragStart = (event) => {
    const { active } = event;
    setActiveDecision(decisions.find(d => d.id === active.id));
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    if (!over) return;
    
    // Check if dropped in a different column
    const activeDecision = decisions.find(d => d.id === active.id);
    if (!activeDecision) return;
    
    // Only update if the decision was moved to a different integration event
    if (activeDecision.integration_event_id !== over.id) {
      try {
        // Update the decision with the new integration event ID
        await keyDecisionService.updateKeyDecision(id, activeDecision.id, {
          integration_event_id: over.id
        });
        
        // Update local state to reflect the change
        setDecisions(prevDecisions => 
          prevDecisions.map(d => 
            d.id === activeDecision.id 
              ? { ...d, integration_event_id: over.id } 
              : d
          )
        );
      } catch (err) {
        console.error("Error updating decision:", err);
        setError("Failed to move key decision. Please try again.");
      }
    }
    
    setActiveDecision(null);
  };

  const handleAddDecision = (eventId) => {
    setSelectedEventId(eventId);
    setIsKDModalOpen(true);
  };

  const handleKDSave = async (kdData) => {
    try {
      // Add the integration event ID to the data if selected
      const fullData = {
        ...kdData,
        integration_event_id: selectedEventId || kdData.integration_event_id
      };
      
      await keyDecisionService.createKeyDecision(id, fullData);
      
      // Refresh decisions
      const updatedDecisions = await keyDecisionService.getProjectKeyDecisions(id);
      setDecisions(updatedDecisions);
      
      setIsKDModalOpen(false);
      setSelectedEventId(null);
    } catch (err) {
      console.error("Error saving key decision:", err);
      setError("Failed to save key decision: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleAddEvent = async () => {
    const name = prompt("Enter name for Integration Event:");
    if (!name) return;
    
    try {
      await integrationEventService.createEvent(id, { name });
      
      // Refresh events
      const updatedEvents = await integrationEventService.getProjectEvents(id);
      setEvents(updatedEvents);
    } catch (err) {
      console.error("Error creating integration event:", err);
      setError("Failed to create integration event.");
    }
  };

  const handleEditEvent = async (event) => {
    const newName = prompt("Edit Integration Event name:", event.name);
    if (!newName || newName === event.name) return;
    
    try {
      await integrationEventService.updateEvent(id, event.id, { name: newName });
      
      // Refresh events
      const updatedEvents = await integrationEventService.getProjectEvents(id);
      setEvents(updatedEvents);
    } catch (err) {
      console.error("Error updating integration event:", err);
      setError("Failed to update integration event.");
    }
  };

  const handleDeleteEvent = async (event) => {
    if (!window.confirm(`Are you sure you want to delete the Integration Event: ${event.name}?`)) {
      return;
    }
    
    try {
      await integrationEventService.deleteEvent(id, event.id);
      
      // Refresh events
      const updatedEvents = await integrationEventService.getProjectEvents(id);
      setEvents(updatedEvents);
      
      // Also refresh decisions as some might have been affected
      const updatedDecisions = await keyDecisionService.getProjectKeyDecisions(id);
      setDecisions(updatedDecisions);
    } catch (err) {
      console.error("Error deleting integration event:", err);
      setError("Failed to delete integration event.");
    }
  };

  const handleEditDecision = (decision) => {
    navigate(`/projects/${id}/key-decisions/${decision.id}`);
  };

  const handleDeleteDecision = async (decision) => {
    if (!window.confirm(`Are you sure you want to delete the Key Decision: ${decision.title}?`)) {
      return;
    }
    
    try {
      await keyDecisionService.deleteKeyDecision(id, decision.id);
      
      // Refresh decisions
      const updatedDecisions = await keyDecisionService.getProjectKeyDecisions(id);
      setDecisions(updatedDecisions);
    } catch (err) {
      console.error("Error deleting key decision:", err);
      setError("Failed to delete key decision.");
    }
  };

  const handleViewDecision = (decision) => {
    navigate(`/projects/${id}/key-decisions/${decision.id}`);
  };

  if (loading) {
    return <div className="loading">Loading project board...</div>;
  }

  if (!project) {
    return <div className="error-message">Project not found.</div>;
  }

  // Group decisions by integration event ID
  const getDecisionsForEvent = (eventId) => {
    const eventDecisions = decisions.filter(decision => decision.integration_event_id === eventId);
    
    // Enhance each decision with its knowledge gaps
    return eventDecisions.map(decision => {
      const decisionKGs = knowledgeGaps.filter(kg => kg.key_decision_id === decision.id);
      return {
        ...decision,
        knowledge_gaps: decisionKGs.map(kg => ({
          id: kg.id,
          title: kg.title
        }))
      };
    });
  };

  return (
    <div className="project-board-container">
      <div className="project-board-header">
        <div className="header-left">
          <h2>{project.title}</h2>
          <span className="project-status">{project.status}</span>
        </div>
        <div className="header-right">
          <button 
            className="back-btn"
            onClick={() => navigate(`/projects/${id}`)}
          >
            Back to Project
          </button>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="board-controls">
        <button 
          className="add-ie-btn"
          onClick={handleAddEvent}
        >
          Add Integration Event
        </button>
      </div>
      
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="board-container">
          {events.length === 0 ? (
            <div className="no-events-message">
              <p>No Integration Events yet. Create your first Integration Event to get started.</p>
              <button 
                className="add-ie-btn"
                onClick={handleAddEvent}
              >
                Add Integration Event
              </button>
            </div>
          ) : (
            events.map(event => (
              <Column 
                key={event.id}
                event={event}
                decisions={getDecisionsForEvent(event.id)}
                projectId={id}
                onAddDecision={handleAddDecision}
                onEditEvent={handleEditEvent}
                onDeleteEvent={handleDeleteEvent}
                onEditDecision={handleEditDecision}
                onDeleteDecision={handleDeleteDecision}
                onViewDecision={handleViewDecision}
              />
            ))
          )}
        </div>
        
        <DragOverlay>
          {activeDecision ? (
            <Card 
              decision={activeDecision}
              projectId={id}
              onEdit={() => {}}
              onDelete={() => {}}
              onView={() => {}}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
      
      {/* Modals */}
      <KeyDecisionModal 
        isOpen={isKDModalOpen}
        onClose={() => {
          setIsKDModalOpen(false);
          setSelectedEventId(null);
        }}
        onSave={handleKDSave}
        projectId={id}
        initialEventId={selectedEventId}
      />
    </div>
  );
};

export default ProjectBoard;