import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate } from 'react-router-dom';

const Card = ({ decision, onEdit, onDelete, onView, projectId }) => {
  const navigate = useNavigate();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: decision.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="kd-card"
    >
      <div className="kd-card-header">
        <h4>{decision.title}</h4>
        <span className="kd-status">{decision.status}</span>
      </div>
      <div className="kd-card-body">
        <p>{decision.description || 'No description provided.'}</p>
        {decision.owner && <p><strong>Owner:</strong> {decision.owner}</p>}
        {decision.decision_maker && (
          <p><strong>Decision Maker:</strong> {decision.decision_maker}</p>
        )}
        
        {/* Display knowledge gaps if any */}
        {decision.knowledge_gaps && decision.knowledge_gaps.length > 0 && (
          <div className="kd-card-knowledge-gaps">
            <p><strong>Knowledge Gaps:</strong></p>
            <ul className="kg-list">
              {decision.knowledge_gaps.map((kg) => (
                <li key={kg.id} className="kg-item">
                  <span 
                    className="kg-title" 
                    title={kg.title}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/projects/${projectId}/knowledge-gaps/${kg.id}`);
                    }}
                  >
                    {kg.title}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="kd-card-actions">
        <button
          className="small-btn view-btn"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/projects/${projectId}/key-decisions/${decision.id}`);
          }}
        >
          View
        </button>
        <button
          className="small-btn edit-btn"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(decision);
          }}
        >
          Edit
        </button>
        <button
          className="small-btn delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(decision);
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default Card;