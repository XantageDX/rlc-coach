// frontend/src/components/projects/board/Column.js

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import Card from './Card';

const Column = ({
  event,
  decisions,
  projectId,
  onAddDecision,
  onEditEvent,
  onDeleteEvent,
  onEditDecision,
  onDeleteDecision,
  onViewDecision
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: event.id
  });

  // Log decisions being passed to cards
  console.log(`Decisions for column ${event.name}:`, decisions);

  return (
    <div className="ie-column">
      <div className="ie-column-header">
        <h3>{event.name}</h3>
        <div className="ie-column-actions">
          <button
            className="icon-btn edit-btn"
            onClick={() => onEditEvent(event)}
            title="Edit Integration Event"
          >
            ✎
          </button>
          <button
            className="icon-btn delete-btn"
            onClick={() => onDeleteEvent(event)}
            title="Delete Integration Event"
          >
            ✕
          </button>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`ie-column-content ${isOver ? 'dragging-over' : ''}`}
      >
        <SortableContext 
          items={decisions.map(d => d.id)} 
          strategy={verticalListSortingStrategy}
        >
          {decisions.length === 0 ? (
            <p className="no-items-text">No key decisions yet</p>
          ) : (
            decisions.map((decision) => (
              <div key={decision.id} className="kd-card-wrapper">
                {/* Display KD number above the card */}
                {decision.sequence && (
                  <div className="kd-sequence-badge">KD{decision.sequence}</div>
                )}
                <Card
                  decision={decision}
                  projectId={projectId}
                  onEdit={onEditDecision}
                  onDelete={onDeleteDecision}
                  onView={onViewDecision}
                />
              </div>
            ))
          )}
        </SortableContext>
      </div>

      <button
        className="add-kd-btn"
        onClick={() => onAddDecision(event.id)}
      >
        Add Key Decision
      </button>
    </div>
  );
};

export default Column;